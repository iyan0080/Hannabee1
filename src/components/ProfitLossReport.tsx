import React, { useState, useMemo } from 'react';
import { useWarung } from '../context/WarungContext';
import { formatRupiah, formatDateOnly } from '../utils/format';
import { exportProfitLossToExcel, exportProfitLossToPDF } from '../utils/exportData';
import {
  FileSpreadsheet,
  FileText,
  Calendar,
  DollarSign,
  TrendingUp,
  ArrowDownCircle,
  Percent,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { ExpenseCategory } from '../types';

type PeriodFilter = 'today' | 'last7' | 'this_month' | 'last_month' | 'all' | 'custom';

export const ProfitLossReport: React.FC = () => {
  const { calculateProfitLoss, storeSettings } = useWarung();

  // Period State
  const [period, setPeriod] = useState<PeriodFilter>('this_month');
  const [customStartDate, setCustomStartDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().slice(0, 10);
  });
  const [customEndDate, setCustomEndDate] = useState<string>(() => {
    return new Date().toISOString().slice(0, 10);
  });

  // Calculate dates based on period selection
  const { startDate, endDate, periodLabel } = useMemo(() => {
    const now = new Date();
    let start = new Date();
    let end = new Date();
    let label = 'Bulan Ini';

    if (period === 'today') {
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      label = 'Hari Ini (' + formatDateOnly(start.toISOString()) + ')';
    } else if (period === 'last7') {
      start.setDate(now.getDate() - 6);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      label = '7 Hari Terakhir';
    } else if (period === 'this_month') {
      start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      label = start.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
    } else if (period === 'last_month') {
      start = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0);
      end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
      label = start.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
    } else if (period === 'all') {
      start = new Date(2020, 0, 1);
      end = new Date(2030, 11, 31);
      label = 'Seluruh Waktu (Semua Transaksi)';
    } else if (period === 'custom') {
      start = new Date(customStartDate + 'T00:00:00');
      end = new Date(customEndDate + 'T23:59:59');
      label = `${formatDateOnly(start.toISOString())} s/d ${formatDateOnly(end.toISOString())}`;
    }

    return { startDate: start, endDate: end, periodLabel: label };
  }, [period, customStartDate, customEndDate]);

  // Financial summary
  const summary = useMemo(() => {
    return calculateProfitLoss(startDate, endDate, periodLabel);
  }, [calculateProfitLoss, startDate, endDate, periodLabel]);

  // Export handlers
  const handleExportExcel = () => {
    exportProfitLossToExcel(summary, storeSettings);
  };

  const handleExportPDF = () => {
    exportProfitLossToPDF(summary, storeSettings);
  };

  const isNetProfitPositive = summary.netProfit >= 0;

  return (
    <div className="max-w-7xl mx-auto p-3 sm:p-5 space-y-5">
      
      {/* Header & Export Actions */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
              📊
            </span>
            <h2 className="text-base sm:text-lg font-bold text-slate-900">
              Laporan Laba Rugi (Income Statement)
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Periode: <span className="font-semibold text-slate-700">{periodLabel}</span>
          </p>
        </div>

        {/* Export Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            id="export-pl-excel-btn"
            onClick={handleExportExcel}
            className="px-3.5 py-2 bg-emerald-50 text-emerald-800 border border-emerald-300 hover:bg-emerald-100 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs transition"
          >
            <FileSpreadsheet size={15} className="text-emerald-700" />
            <span>Ekspor Excel (.xlsx)</span>
          </button>

          <button
            id="export-pl-pdf-btn"
            onClick={handleExportPDF}
            className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs transition"
          >
            <FileText size={15} className="text-slate-300" />
            <span>Cetak PDF Laporan</span>
          </button>
        </div>
      </div>

      {/* Period Filter Selector */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
          <Calendar size={15} className="text-slate-500" />
          <span>Pilih Rentang Periode Laporan:</span>
        </div>

        <div className="flex flex-wrap gap-2">
          {[
            { id: 'today', label: 'Hari Ini' },
            { id: 'last7', label: '7 Hari Terakhir' },
            { id: 'this_month', label: 'Bulan Ini' },
            { id: 'last_month', label: 'Bulan Lalu' },
            { id: 'all', label: 'Semua Periode' },
            { id: 'custom', label: 'Pilih Tanggal Manual' },
          ].map(btn => (
            <button
              key={btn.id}
              id={`filter-period-${btn.id}`}
              onClick={() => setPeriod(btn.id as PeriodFilter)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition ${
                period === btn.id
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {btn.label}
            </button>
          ))}
        </div>

        {/* Custom Date Picker */}
        {period === 'custom' && (
          <div className="pt-2 flex flex-wrap items-center gap-3 border-t border-slate-100 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-slate-500">Dari Tanggal:</span>
              <input
                id="pl-start-date"
                type="date"
                value={customStartDate}
                onChange={e => setCustomStartDate(e.target.value)}
                className="px-2.5 py-1 bg-white border border-slate-300 rounded-lg text-xs font-mono"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-slate-500">Sampai Tanggal:</span>
              <input
                id="pl-end-date"
                type="date"
                value={customEndDate}
                onChange={e => setCustomEndDate(e.target.value)}
                className="px-2.5 py-1 bg-white border border-slate-300 rounded-lg text-xs font-mono"
              />
            </div>
          </div>
        )}
      </div>

      {/* Top 4 Financial Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        
        {/* Total Omzet Penjualan */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs text-slate-500 font-medium">1. Total Penjualan (Omzet)</span>
          <h3 className="text-base sm:text-lg font-bold text-slate-900 mt-1 font-mono">
            {formatRupiah(summary.totalSales)}
          </h3>
          <p className="text-[11px] text-slate-500 mt-0.5">
            {summary.transactionCount} Transaksi Selesai
          </p>
        </div>

        {/* Total HPP Modal */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs text-slate-500 font-medium">2. HPP (Modal Pokok)</span>
          <h3 className="text-base sm:text-lg font-bold text-slate-700 mt-1 font-mono">
            {formatRupiah(summary.totalCostOfGoods)}
          </h3>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Bahan Baku Produk Terjual
          </p>
        </div>

        {/* Laba Kotor */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs text-slate-500 font-medium">3. Laba Kotor (Gross)</span>
          <h3 className="text-base sm:text-lg font-bold text-teal-700 mt-1 font-mono">
            {formatRupiah(summary.grossProfit)}
          </h3>
          <p className="text-[11px] text-teal-600 font-semibold mt-0.5">
            Margin Kotor: {summary.grossMargin.toFixed(1)}%
          </p>
        </div>

        {/* LABA BERSIH (NET PROFIT) */}
        <div className={`p-4 rounded-2xl border shadow-xs ${
          isNetProfitPositive
            ? 'bg-emerald-50/70 border-emerald-300'
            : 'bg-red-50/70 border-red-300'
        }`}>
          <span className="text-xs font-semibold text-slate-700">4. LABA BERSIH (NET PROFIT)</span>
          <h3 className={`text-base sm:text-lg font-bold mt-1 font-mono ${
            isNetProfitPositive ? 'text-emerald-800' : 'text-red-700'
          }`}>
            {formatRupiah(summary.netProfit)}
          </h3>
          <p className={`text-[11px] font-semibold mt-0.5 ${
            isNetProfitPositive ? 'text-emerald-700' : 'text-red-600'
          }`}>
            Margin Bersih: {summary.netMargin.toFixed(1)}%
          </p>
        </div>
      </div>

      {/* Main Income Statement Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
          <h3 className="font-bold text-sm">Rincian Laporan Laba Rugi Komprehensif</h3>
          <span className="text-xs text-slate-400 font-mono">Satuan: Rupiah (IDR)</span>
        </div>

        <div className="p-4 sm:p-6 overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
                <th className="text-left pb-3">Pos Keuangan</th>
                <th className="text-right pb-3">Nominal</th>
                <th className="text-right pb-3">Rasio / Keterangan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              
              {/* 1. PENDAPATAN */}
              <tr className="bg-slate-50/80 font-bold text-slate-900">
                <td className="py-2.5 font-semibold">1. PENDAPATAN USAHA (OMZET PENJUALAN)</td>
                <td className="py-2.5 text-right font-mono text-emerald-800">{formatRupiah(summary.totalSales)}</td>
                <td className="py-2.5 text-right text-slate-600">100.0%</td>
              </tr>
              <tr className="text-slate-600">
                <td className="py-2 pl-4">• Jumlah Transaksi Sukses</td>
                <td className="py-2 text-right font-mono">{summary.transactionCount} Transaksi</td>
                <td className="py-2 text-right text-slate-400">-</td>
              </tr>
              <tr className="text-slate-600">
                <td className="py-2 pl-4">• Rata-rata Penjualan per Transaksi</td>
                <td className="py-2 text-right font-mono">{formatRupiah(summary.averageTransactionValue)}</td>
                <td className="py-2 text-right text-slate-400">-</td>
              </tr>

              {/* 2. HPP */}
              <tr className="bg-slate-50/80 font-bold text-slate-900">
                <td className="py-2.5 font-semibold">2. HARGA POKOK PENJUALAN (HPP / MODAL)</td>
                <td className="py-2.5 text-right font-mono text-red-700">({formatRupiah(summary.totalCostOfGoods)})</td>
                <td className="py-2.5 text-right text-slate-600">
                  {summary.totalSales > 0 ? `${((summary.totalCostOfGoods / summary.totalSales) * 100).toFixed(1)}%` : '0%'}
                </td>
              </tr>

              {/* 3. LABA KOTOR */}
              <tr className="bg-teal-50/60 font-bold text-teal-950">
                <td className="py-2.5 pl-2 font-bold">3. LABA KOTOR (GROSS PROFIT = OMZET - HPP)</td>
                <td className="py-2.5 text-right font-mono text-teal-800">{formatRupiah(summary.grossProfit)}</td>
                <td className="py-2.5 text-right text-teal-700 font-semibold">{summary.grossMargin.toFixed(1)}%</td>
              </tr>

              {/* 4. BEBAN PENGELUARAN */}
              <tr className="bg-slate-50/80 font-bold text-slate-900">
                <td className="py-2.5 font-semibold" colSpan={3}>4. BEBAN OPERASIONAL & PENGELUARAN WARUNG</td>
              </tr>
              {Object.entries(summary.expenseBreakdown).map(([cat, rawAmt]) => {
                const amt = Number(rawAmt) || 0;
                if (!amt) return null;
                return (
                  <tr key={cat} className="text-slate-600">
                    <td className="py-1.5 pl-4">• {cat}</td>
                    <td className="py-1.5 text-right font-mono text-red-600">({formatRupiah(amt)})</td>
                    <td className="py-1.5 text-right text-slate-400">
                      {summary.totalSales > 0 ? `${((amt / summary.totalSales) * 100).toFixed(1)}%` : '0%'}
                    </td>
                  </tr>
                );
              })}
              <tr className="font-semibold text-slate-800">
                <td className="py-2 pl-4">TOTAL BEBAN OPERASIONAL</td>
                <td className="py-2 text-right font-mono text-red-700">({formatRupiah(summary.totalExpenses)})</td>
                <td className="py-2 text-right text-slate-600">
                  {summary.totalSales > 0 ? `${((summary.totalExpenses / summary.totalSales) * 100).toFixed(1)}%` : '0%'}
                </td>
              </tr>

              {/* 5. LABA BERSIH (NET PROFIT) */}
              <tr className={`font-bold text-sm ${
                isNetProfitPositive ? 'bg-emerald-100 text-emerald-950' : 'bg-red-100 text-red-950'
              }`}>
                <td className="py-3 pl-2">5. LABA BERSIH FINAL (NET PROFIT)</td>
                <td className="py-3 text-right font-mono">{formatRupiah(summary.netProfit)}</td>
                <td className="py-3 text-right">{summary.netMargin.toFixed(1)}%</td>
              </tr>

              {/* Catatan Piutang */}
              <tr className="text-slate-600 bg-amber-50/40">
                <td className="py-2.5 pl-2 font-medium">Catatan: Sisa Kasbon / Piutang Belum Lunas (Periode Ini)</td>
                <td className="py-2.5 text-right font-mono text-amber-800 font-semibold">{formatRupiah(summary.unpaidDebtTotal)}</td>
                <td className="py-2.5 text-right text-amber-700">Kasbon Aktif</td>
              </tr>

            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
