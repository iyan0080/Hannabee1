import React, { useState, useMemo } from 'react';
import { useWarung } from '../context/WarungContext';
import { formatRupiah, formatDateOnly } from '../utils/format';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
} from 'recharts';
import {
  DollarSign,
  TrendingUp,
  ShoppingBag,
  AlertCircle,
  Clock,
  Sparkles,
  Award,
  CreditCard,
  Send,
  RefreshCw,
  Calendar,
  Filter,
  CalendarRange,
  ChevronDown,
} from 'lucide-react';

const COLORS = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#06b6d4'];

export type AnalyticsPeriodType = 'TODAY' | '7_DAYS' | '30_DAYS' | 'THIS_MONTH' | 'LAST_MONTH' | 'CUSTOM';

export const AnalyticsDashboard: React.FC = () => {
  const { transactions, expenses, customers, storeSettings } = useWarung();

  // Period Selector State
  const [periodType, setPeriodType] = useState<AnalyticsPeriodType>('7_DAYS');
  
  // Custom Date Range State
  const getTodayISO = () => new Date().toISOString().slice(0, 10);
  const get7DaysAgoISO = () => {
    const d = new Date();
    d.setDate(d.getDate() - 6);
    return d.toISOString().slice(0, 10);
  };

  const [customStartDate, setCustomStartDate] = useState<string>(get7DaysAgoISO());
  const [customEndDate, setCustomEndDate] = useState<string>(getTodayISO());

  // AI Advisor State
  const [aiLoading, setAiLoading] = useState(false);
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [aiCustomPrompt, setAiCustomPrompt] = useState('');

  // 1. Calculate Active Date Range Bounds based on Period Type
  const { startDate, endDate, periodLabel } = useMemo(() => {
    const now = new Date();
    let start = new Date();
    let end = new Date();
    let label = '';

    if (periodType === 'TODAY') {
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      label = `Hari Ini (${now.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })})`;
    } else if (periodType === '7_DAYS') {
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6, 0, 0, 0, 0);
      end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      label = `7 Hari Terakhir (${start.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} - ${end.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })})`;
    } else if (periodType === '30_DAYS') {
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29, 0, 0, 0, 0);
      end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      label = `30 Hari Terakhir (${start.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} - ${end.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })})`;
    } else if (periodType === 'THIS_MONTH') {
      start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      label = `Bulan Ini (${now.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })})`;
    } else if (periodType === 'LAST_MONTH') {
      start = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
      end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
      label = `Bulan Lalu (${start.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })})`;
    } else {
      // CUSTOM
      const s = customStartDate ? new Date(customStartDate + 'T00:00:00') : new Date(now.getFullYear(), now.getMonth(), 1);
      const e = customEndDate ? new Date(customEndDate + 'T23:59:59.999') : new Date();
      start = s;
      end = e;
      label = `Periode: ${s.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })} s/d ${e.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}`;
    }

    return { startDate: start, endDate: end, periodLabel: label };
  }, [periodType, customStartDate, customEndDate]);

  // 2. Filtered Transactions and Expenses for the Selected Period
  const periodTransactions = useMemo(() => {
    const startMs = startDate.getTime();
    const endMs = endDate.getTime();

    return transactions.filter(t => {
      if (t.status === 'BATAL') return false;
      const tMs = new Date(t.timestamp).getTime();
      return tMs >= startMs && tMs <= endMs;
    });
  }, [transactions, startDate, endDate]);

  const periodExpenses = useMemo(() => {
    const startMs = startDate.getTime();
    const endMs = endDate.getTime();

    return expenses.filter(e => {
      const eMs = new Date(e.timestamp).getTime();
      return eMs >= startMs && eMs <= endMs;
    });
  }, [expenses, startDate, endDate]);

  // 3. Computed Financial Metrics for the Period
  const periodSales = useMemo(() => periodTransactions.reduce((s, t) => s + t.finalAmount, 0), [periodTransactions]);
  const periodHPP = useMemo(() => periodTransactions.reduce((s, t) => s + t.totalCost, 0), [periodTransactions]);
  const periodGrossProfit = periodSales - periodHPP;
  const periodTotalExpenses = useMemo(() => periodExpenses.reduce((s, e) => s + e.amount, 0), [periodExpenses]);
  const periodNetProfit = periodGrossProfit - periodTotalExpenses;
  const periodTransactionCount = periodTransactions.length;
  const averageBasketValue = periodTransactionCount > 0 ? periodSales / periodTransactionCount : 0;

  // Active Kasbon Total (Global current balance)
  const totalActiveDebt = useMemo(() => customers.reduce((s, c) => s + (c.totalDebt || 0), 0), [customers]);

  // 4. Trend Data for Chart according to the active period
  const chartData = useMemo(() => {
    const daysMap: { [key: string]: { date: string; displayDate: string; omzet: number; labaKotor: number; pengeluaran: number; labaBersih: number } } = {};
    
    // Generate all day keys between startDate and endDate
    const currentCursor = new Date(startDate);
    currentCursor.setHours(0, 0, 0, 0);

    const endCursor = new Date(endDate);
    endCursor.setHours(0, 0, 0, 0);

    // Limit to max 60 days to keep chart performant and readable
    let dayCount = 0;
    while (currentCursor <= endCursor && dayCount <= 60) {
      const dateKey = currentCursor.toISOString().slice(0, 10);
      const displayDate = currentCursor.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        ...(dayCount > 14 ? {} : { weekday: 'short' })
      });

      daysMap[dateKey] = {
        date: dateKey,
        displayDate,
        omzet: 0,
        labaKotor: 0,
        pengeluaran: 0,
        labaBersih: 0,
      };

      currentCursor.setDate(currentCursor.getDate() + 1);
      dayCount++;
    }

    // Populate transactions
    periodTransactions.forEach(t => {
      const dateKey = t.timestamp.slice(0, 10);
      if (daysMap[dateKey]) {
        daysMap[dateKey].omzet += t.finalAmount;
        daysMap[dateKey].labaKotor += t.grossProfit;
      }
    });

    // Populate expenses
    periodExpenses.forEach(e => {
      const dateKey = e.timestamp.slice(0, 10);
      if (daysMap[dateKey]) {
        daysMap[dateKey].pengeluaran += e.amount;
      }
    });

    // Calculate net profit per day
    Object.values(daysMap).forEach(d => {
      d.labaBersih = d.labaKotor - d.pengeluaran;
    });

    return Object.values(daysMap);
  }, [periodTransactions, periodExpenses, startDate, endDate]);

  // 5. Top Selling Products in Selected Period
  const topProducts = useMemo(() => {
    const map: { [key: string]: { name: string; quantity: number; revenue: number; profit: number } } = {};

    periodTransactions.forEach(t => {
      t.items.forEach(item => {
        if (!map[item.productId]) {
          map[item.productId] = {
            name: item.productName,
            quantity: 0,
            revenue: 0,
            profit: 0,
          };
        }
        map[item.productId].quantity += item.quantity;
        map[item.productId].revenue += item.subtotal;
        map[item.productId].profit += (item.subtotal - item.subtotalCost);
      });
    });

    return Object.values(map)
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);
  }, [periodTransactions]);

  // 6. Payment Method Distribution in Selected Period
  const paymentDistribution = useMemo(() => {
    const map: { [key: string]: number } = {
      TUNAI: 0,
      QRIS: 0,
      TRANSFER: 0,
      KASBON: 0,
    };

    periodTransactions.forEach(t => {
      map[t.paymentMethod] = (map[t.paymentMethod] || 0) + t.finalAmount;
    });

    return Object.entries(map).map(([name, value]) => ({
      name,
      value,
    }));
  }, [periodTransactions]);

  // 7. Hourly Peak Hours Breakdown in Selected Period
  const hourlyData = useMemo(() => {
    const hours: { [key: number]: number } = {};
    for (let h = 6; h <= 23; h++) hours[h] = 0;

    periodTransactions.forEach(t => {
      const hour = new Date(t.timestamp).getHours();
      if (hours[hour] !== undefined) {
        hours[hour] += 1;
      }
    });

    return Object.entries(hours).map(([hour, count]) => ({
      hour: `${hour.padStart(2, '0')}:00`,
      count,
    }));
  }, [periodTransactions]);

  // AI Business Consultant request
  const handleFetchAiInsight = async (customPrompt?: string) => {
    setAiLoading(true);
    try {
      const summaryContext = {
        storeName: storeSettings.storeName,
        periodLabel,
        sales: periodSales,
        netProfit: periodNetProfit,
        transactionsCount: periodTransactionCount,
        averageBasket: averageBasketValue,
        totalActiveKasbon: totalActiveDebt,
        topSellingItems: topProducts.map(p => `${p.name} (${p.quantity} terjual)`),
      };

      const res = await fetch('/api/ai/advisor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'analysis',
          summary: summaryContext,
          prompt: customPrompt || aiCustomPrompt || `Berikan 3 strategi taktis untuk mendongkrak omzet dan menekan biaya untuk ${periodLabel} warung kami.`,
        }),
      });

      const json = await res.json();
      if (json.content) {
        setAiInsight(json.content);
      }
    } catch (err) {
      setAiInsight(`💡 *Tips Analitik Bisnis Warung (${periodLabel})*:\n1. Omzet penjualan tercatat ${formatRupiah(periodSales)} dengan Laba Bersih ${formatRupiah(periodNetProfit)}.\n2. Pastikan stok untuk menu terlaris selalu aman.\n3. Pertahankan efisiensi operasional dan pantau kasbon yang belum terlunasi.`);
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-3 sm:p-5 space-y-5">
      
      {/* Date Period Filter Selector Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center font-bold">
              <CalendarRange size={16} />
            </span>
            <div>
              <h3 className="font-bold text-sm text-slate-900">Periode Analitik Penjualan</h3>
              <p className="text-xs text-slate-500 font-medium">{periodLabel}</p>
            </div>
          </div>

          {/* Period Presets Selector */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              id="analytics-period-today"
              onClick={() => setPeriodType('TODAY')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                periodType === 'TODAY'
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              Hari Ini
            </button>

            <button
              id="analytics-period-7days"
              onClick={() => setPeriodType('7_DAYS')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                periodType === '7_DAYS'
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              7 Hari Terakhir
            </button>

            <button
              id="analytics-period-30days"
              onClick={() => setPeriodType('30_DAYS')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                periodType === '30_DAYS'
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              30 Hari Terakhir
            </button>

            <button
              id="analytics-period-thismonth"
              onClick={() => setPeriodType('THIS_MONTH')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                periodType === 'THIS_MONTH'
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              Bulan Ini
            </button>

            <button
              id="analytics-period-lastmonth"
              onClick={() => setPeriodType('LAST_MONTH')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                periodType === 'LAST_MONTH'
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              Bulan Lalu
            </button>

            <button
              id="analytics-period-custom"
              onClick={() => setPeriodType('CUSTOM')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1 ${
                periodType === 'CUSTOM'
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              <Calendar size={13} />
              <span>Pilih Tanggal</span>
            </button>
          </div>
        </div>

        {/* Custom Date Pickers when CUSTOM is active */}
        {periodType === 'CUSTOM' && (
          <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center gap-3 bg-slate-50 p-3 rounded-xl">
            <div className="flex items-center gap-2">
              <label className="text-xs font-medium text-slate-600">Dari Tanggal:</label>
              <input
                id="analytics-custom-start-date"
                type="date"
                value={customStartDate}
                onChange={e => setCustomStartDate(e.target.value)}
                className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-800"
              />
            </div>

            <div className="flex items-center gap-2">
              <label className="text-xs font-medium text-slate-600">Sampai Tanggal:</label>
              <input
                id="analytics-custom-end-date"
                type="date"
                value={customEndDate}
                onChange={e => setCustomEndDate(e.target.value)}
                className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-800"
              />
            </div>

            <span className="text-[11px] text-slate-500 italic">
              Data analitik otomatis diperbarui sesuai rentang tanggal yang Anda tentukan.
            </span>
          </div>
        )}
      </div>

      {/* 1. Real-time KPI Banner for the Selected Period */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Penjualan Periode */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <DollarSign size={24} />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Omzet Penjualan</p>
            <h3 className="text-base sm:text-lg font-bold text-slate-900 font-mono">
              {formatRupiah(periodSales)}
            </h3>
            <p className="text-[11px] text-emerald-600 font-medium mt-0.5">
              {periodTransactionCount} Transaksi Selesai
            </p>
          </div>
        </div>

        {/* Laba Bersih Periode */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center shrink-0">
            <TrendingUp size={24} />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Laba Bersih Periode</p>
            <h3 className={`text-base sm:text-lg font-bold font-mono ${periodNetProfit >= 0 ? 'text-teal-700' : 'text-red-600'}`}>
              {formatRupiah(periodNetProfit)}
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Beban Biaya: {formatRupiah(periodTotalExpenses)}
            </p>
          </div>
        </div>

        {/* Rata-rata Nilai Belanja */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <ShoppingBag size={24} />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Rata-Rata per Nota</p>
            <h3 className="text-base sm:text-lg font-bold text-slate-900 font-mono">
              {formatRupiah(averageBasketValue)}
            </h3>
            <p className="text-[11px] text-blue-600 font-medium mt-0.5">
              Laba Kotor: {formatRupiah(periodGrossProfit)}
            </p>
          </div>
        </div>

        {/* Total Kasbon / Piutang Aktif */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <AlertCircle size={24} />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Total Kasbon Belum Lunas</p>
            <h3 className="text-base sm:text-lg font-bold text-amber-700 font-mono">
              {formatRupiah(totalActiveDebt)}
            </h3>
            <p className="text-[11px] text-amber-600 font-medium mt-0.5">
              Piutang Pelanggan
            </p>
          </div>
        </div>
      </div>

      {/* 2. Charts Section (Sales Trend & Payment Split) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* Trend Bar Chart: Sales & Net Profit in Selected Period */}
        <div className="lg:col-span-8 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-4">
            <div>
              <h3 className="font-bold text-sm text-slate-900">
                Grafik Tren Penjualan & Laba Harian
              </h3>
              <p className="text-xs text-slate-500">
                Perbandingan Omzet, Pengeluaran, dan Laba Bersih ({periodLabel})
              </p>
            </div>
            <span className="text-[11px] text-slate-400 font-medium">
              Total {chartData.length} Titik Tanggal
            </span>
          </div>

          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="displayDate" tick={{ fontSize: 10, fill: '#64748b' }} />
                <YAxis tick={{ fontSize: 10, fill: '#64748b' }} tickFormatter={v => `${v / 1000}k`} />
                <Tooltip
                  formatter={(val: any) => formatRupiah(Number(val))}
                  contentStyle={{ backgroundColor: '#1e293b', borderRadius: '12px', color: '#fff', fontSize: '12px' }}
                />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                <Bar dataKey="omzet" name="Omzet Penjualan" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="pengeluaran" name="Pengeluaran" fill="#ef4444" radius={[4, 4, 0, 0]} />
                <Bar dataKey="labaBersih" name="Laba Bersih" fill="#0d9488" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Payment Methods Distribution in Selected Period */}
        <div className="lg:col-span-4 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-sm text-slate-900 mb-1">Metode Pembayaran</h3>
            <p className="text-xs text-slate-500 mb-2">Porsi omzet berdasarkan kanal bayar</p>
          </div>

          <div className="h-[180px] w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={paymentDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={75}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {paymentDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(val: any) => formatRupiah(Number(val))} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Custom legend */}
          <div className="space-y-1.5 pt-2 border-t border-slate-100 text-xs">
            {paymentDistribution.map((item, idx) => (
              <div key={item.name} className="flex items-center justify-between text-slate-700">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                  <span className="font-medium">{item.name}</span>
                </div>
                <span className="font-semibold font-mono">{formatRupiah(item.value)}</span>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* 3. Top Selling Products & Hourly Peak Rush for the Selected Period */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* Top 5 Products */}
        <div className="lg:col-span-6 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <Award className="text-amber-500" size={18} />
              <span>5 Menu Terlaris ({periodLabel})</span>
            </h3>
          </div>

          <div className="space-y-3">
            {topProducts.map((prod, idx) => (
              <div key={idx} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                <div className="flex items-center gap-3">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs ${
                    idx === 0 ? 'bg-amber-100 text-amber-800' : 'bg-slate-200 text-slate-700'
                  }`}>
                    #{idx + 1}
                  </div>
                  <div>
                    <h5 className="font-semibold text-xs text-slate-900">{prod.name}</h5>
                    <p className="text-[11px] text-slate-500 font-mono">
                      Terjual: <b>{prod.quantity} porsi/unit</b>
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="font-bold text-xs text-emerald-800 block font-mono">
                    {formatRupiah(prod.revenue)}
                  </span>
                  <span className="text-[10px] text-teal-600 font-medium">
                    Laba: {formatRupiah(prod.profit)}
                  </span>
                </div>
              </div>
            ))}

            {topProducts.length === 0 && (
              <div className="py-8 text-center text-xs text-slate-400">
                Belum ada data penjualan produk pada periode ini.
              </div>
            )}
          </div>
        </div>

        {/* Hourly Peak Rush in Selected Period */}
        <div className="lg:col-span-6 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <Clock className="text-blue-500" size={18} />
                <span>Jam Sibuk / Jam Ramai Pelanggan</span>
              </h3>
              <p className="text-xs text-slate-500">Frekuensi transaksi berdasarkan jam buka warung</p>
            </div>
          </div>

          <div className="h-[230px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={hourlyData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="hour" tick={{ fontSize: 10, fill: '#64748b' }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: '#64748b' }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1e293b', borderRadius: '8px', color: '#fff', fontSize: '11px' }}
                />
                <Bar dataKey="count" name="Jumlah Transaksi" fill="#3b82f6" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* 4. AI Warung Advisor Assistant (Gemini Powered) */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white p-5 rounded-2xl shadow-md border border-slate-700">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
              <Sparkles size={20} />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <span>Asisten Konsultan Bisnis Warung (AI)</span>
                <span className="bg-emerald-500/30 text-emerald-300 text-[10px] px-2 py-0.2 rounded-full font-medium">
                  Gemini Powered
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Analisis cerdas data performa warung untuk <b>{periodLabel}</b>.
              </p>
            </div>
          </div>

          <button
            id="generate-ai-insight-btn"
            onClick={() => handleFetchAiInsight()}
            disabled={aiLoading}
            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-4 py-2 rounded-xl flex items-center gap-1.5 shadow-xs transition disabled:opacity-50"
          >
            {aiLoading ? <RefreshCw size={14} className="animate-spin" /> : <Sparkles size={14} />}
            <span>{aiLoading ? 'Menganalisis...' : 'Analisis Performa Periode Ini'}</span>
          </button>
        </div>

        {/* AI Insight Box */}
        {aiInsight ? (
          <div className="bg-slate-800/90 border border-slate-700 rounded-xl p-4 text-xs text-slate-200 whitespace-pre-line leading-relaxed">
            {aiInsight}
          </div>
        ) : (
          <div className="bg-slate-800/50 border border-dashed border-slate-700 rounded-xl p-4 text-xs text-slate-400 text-center">
            Klik tombol <b>"Analisis Performa Periode Ini"</b> untuk mendapatkan wawasan cerdas seputar omzet, margin keuntungan, dan strategi peningkatan penjualan pada rentang tanggal yang dipilih.
          </div>
        )}
      </div>

    </div>
  );
};
