import React, { useState, useMemo } from 'react';
import { useWarung } from '../context/WarungContext';
import {
  formatRupiah,
  formatDate,
  formatDateOnly,
  getTodayStart,
  getTodayEnd,
  getLast7DaysStart,
  getMonthStart,
  getMonthEnd,
  getLastMonthStart,
  getLastMonthEnd,
} from '../utils/format';
import {
  exportBookkeepingToExcel,
  exportBookkeepingToPDF,
  exportCashFlowToPDF,
  exportCashClosingToPDF,
} from '../utils/exportData';
import {
  CashAccountType,
  JournalCategory,
  JournalEntryType,
  CashDenomination,
  CashClosingRecord,
  JournalEntryItem,
} from '../types';
import {
  BookOpen,
  PlusCircle,
  MinusCircle,
  FileSpreadsheet,
  Printer,
  Download,
  Calendar,
  Filter,
  Search,
  CheckCircle2,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownLeft,
  Wallet,
  Building2,
  QrCode,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Clock,
  User,
  Trash2,
  RefreshCw,
  Coins,
  History,
  FileText,
  Calculator,
  ShieldCheck,
  ChevronRight,
  X,
  CreditCard,
} from 'lucide-react';

type BookkeepingTab = 'ledger' | 'closing' | 'cash_flow';
type PeriodOption = 'today' | '7days' | 'this_month' | 'last_month' | 'custom';

export const BookkeepingView: React.FC = () => {
  const {
    storeSettings,
    currentUser,
    manualJournals,
    cashClosings,
    addManualJournalEntry,
    deleteManualJournalEntry,
    addCashClosingRecord,
    deleteCashClosingRecord,
    getAllJournalEntries,
    calculateCashFlow,
  } = useWarung();

  // Active Sub-Tab
  const [activeTab, setActiveTab] = useState<BookkeepingTab>('ledger');

  // Filter State for Ledger
  const [periodOption, setPeriodOption] = useState<PeriodOption>('this_month');
  const [customStartDate, setCustomStartDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().slice(0, 10);
  });
  const [customEndDate, setCustomEndDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [selectedAccount, setSelectedAccount] = useState<CashAccountType | 'ALL'>('ALL');
  const [selectedType, setSelectedType] = useState<'ALL' | 'KAS_MASUK' | 'KAS_KELUAR'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modal State for Manual Entry
  const [isEntryModalOpen, setIsEntryModalOpen] = useState<boolean>(false);
  const [entryType, setEntryType] = useState<JournalEntryType>('KAS_MASUK');
  const [entryCategory, setEntryCategory] = useState<string>('Modal Awal / Tambahan Modal');
  const [entryTitle, setEntryTitle] = useState<string>('');
  const [entryAmount, setEntryAmount] = useState<string>('');
  const [entryAccount, setEntryAccount] = useState<CashAccountType>('KAS_TUNAI');
  const [entryParty, setEntryParty] = useState<string>('');
  const [entryNotes, setEntryNotes] = useState<string>('');

  // Cash Closing Calculator State
  const [cashierName, setCashierName] = useState<string>(currentUser?.name || storeSettings.cashierName || 'Kasir');
  const [denominations, setDenominations] = useState<CashDenomination>({
    k100000: 0,
    k50000: 0,
    k20000: 0,
    k10000: 0,
    k5000: 0,
    k2000: 0,
    k1000: 0,
    coins: 0,
  });
  const [closingNotes, setClosingNotes] = useState<string>('');
  const [closingSuccessDialog, setClosingSuccessDialog] = useState<CashClosingRecord | null>(null);

  // Determine current date range based on period option
  const { startDate, endDate, periodLabel } = useMemo(() => {
    let s = new Date();
    let e = new Date();
    let label = 'Hari Ini';

    if (periodOption === 'today') {
      s = getTodayStart();
      e = getTodayEnd();
      label = 'Hari Ini';
    } else if (periodOption === '7days') {
      s = getLast7DaysStart();
      e = getTodayEnd();
      label = '7 Hari Terakhir';
    } else if (periodOption === 'this_month') {
      s = getMonthStart();
      e = getMonthEnd();
      label = 'Bulan Ini';
    } else if (periodOption === 'last_month') {
      s = getLastMonthStart();
      e = getLastMonthEnd();
      label = 'Bulan Lalu';
    } else if (periodOption === 'custom') {
      s = new Date(customStartDate + 'T00:00:00');
      e = new Date(customEndDate + 'T23:59:59.999');
      label = `${formatDateOnly(s.toISOString())} s/d ${formatDateOnly(e.toISOString())}`;
    }

    return { startDate: s, endDate: e, periodLabel: label };
  }, [periodOption, customStartDate, customEndDate]);

  // Fetch entries based on filters
  const allFilteredEntries = useMemo(() => {
    const raw = getAllJournalEntries(startDate, endDate, selectedAccount);
    return raw.filter(item => {
      if (selectedType !== 'ALL' && item.type !== selectedType) return false;
      if (searchQuery.trim() !== '') {
        const q = searchQuery.toLowerCase();
        const matchesTitle = item.title.toLowerCase().includes(q);
        const matchesCat = item.category.toLowerCase().includes(q);
        const matchesNotes = (item.notes || '').toLowerCase().includes(q);
        const matchesActor = (item.actorName || '').toLowerCase().includes(q);
        if (!matchesTitle && !matchesCat && !matchesNotes && !matchesActor) return false;
      }
      return true;
    });
  }, [getAllJournalEntries, startDate, endDate, selectedAccount, selectedType, searchQuery]);

  // Overall account balances (Total All Time)
  const accountBalances = useMemo(() => {
    const all = getAllJournalEntries(undefined, undefined, 'ALL');
    let cashInDrawer = 0;
    let bankTransfer = 0;
    let qrisBalance = 0;
    let totalIn = 0;
    let totalOut = 0;

    all.forEach(item => {
      const isPlus = item.type === 'KAS_MASUK';
      const val = isPlus ? item.amount : -item.amount;

      if (isPlus) totalIn += item.amount;
      else totalOut += item.amount;

      if (item.account === 'KAS_TUNAI') cashInDrawer += val;
      else if (item.account === 'BANK_TRANSFER') bankTransfer += val;
      else if (item.account === 'QRIS') qrisBalance += val;
    });

    return {
      cashInDrawer,
      bankTransfer,
      qrisBalance,
      totalNetCash: cashInDrawer + bankTransfer + qrisBalance,
      periodIn: allFilteredEntries.filter(e => e.type === 'KAS_MASUK').reduce((a, c) => a + c.amount, 0),
      periodOut: allFilteredEntries.filter(e => e.type === 'KAS_KELUAR').reduce((a, c) => a + c.amount, 0),
    };
  }, [getAllJournalEntries, allFilteredEntries]);

  // Cash Closing Calculation for Today
  const todayCashCalculation = useMemo(() => {
    const start = getTodayStart();
    const end = getTodayEnd();
    const todayEntries = getAllJournalEntries(start, end, 'KAS_TUNAI');

    let salesCash = 0;
    let expensesCash = 0;
    let manualInCash = 0;
    let manualOutCash = 0;
    let expectedCash = 0;

    todayEntries.forEach(item => {
      if (item.type === 'KAS_MASUK') {
        expectedCash += item.amount;
        if (item.category === 'Penjualan Kasir' || item.category === 'Pelunasan Kasbon' || item.category === 'Top-Up Saldo Deposit') {
          salesCash += item.amount;
        } else {
          manualInCash += item.amount;
        }
      } else {
        expectedCash -= item.amount;
        if (item.referenceType === 'EXPENSE') {
          expensesCash += item.amount;
        } else {
          manualOutCash += item.amount;
        }
      }
    });

    const physicalTotal =
      (denominations.k100000 || 0) * 100000 +
      (denominations.k50000 || 0) * 50000 +
      (denominations.k20000 || 0) * 20000 +
      (denominations.k10000 || 0) * 10000 +
      (denominations.k5000 || 0) * 5000 +
      (denominations.k2000 || 0) * 2000 +
      (denominations.k1000 || 0) * 1000 +
      (Number(denominations.coins) || 0);

    const difference = physicalTotal - expectedCash;

    return {
      expectedCash,
      physicalTotal,
      difference,
      salesCash,
      expensesCash,
      manualInCash,
      manualOutCash,
    };
  }, [getAllJournalEntries, denominations]);

  // Cash Flow Calculation for active period
  const cashFlowData = useMemo(() => {
    return calculateCashFlow(startDate, endDate, periodLabel);
  }, [calculateCashFlow, startDate, endDate, periodLabel]);

  // Handle Submit Manual Entry
  const handleSaveManualEntry = (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = Number(entryAmount.replace(/\D/g, ''));
    if (!amountNum || amountNum <= 0) {
      alert('Silakan masukkan nominal yang valid.');
      return;
    }
    if (!entryTitle.trim()) {
      alert('Silakan masukkan keterangan transaksi.');
      return;
    }

    addManualJournalEntry({
      timestamp: new Date().toISOString(),
      type: entryType,
      category: entryCategory,
      title: entryTitle.trim(),
      amount: amountNum,
      account: entryAccount,
      recipientOrSource: entryParty.trim() || undefined,
      notes: entryNotes.trim() || undefined,
      actorName: currentUser?.name || storeSettings.cashierName || 'Kasir',
    });

    // Reset Form
    setEntryTitle('');
    setEntryAmount('');
    setEntryParty('');
    setEntryNotes('');
    setIsEntryModalOpen(false);
  };

  // Handle Save Cash Closing Record
  const handleSaveCashClosing = () => {
    const newRecord = addCashClosingRecord({
      timestamp: new Date().toISOString(),
      dateStr: new Date().toISOString().slice(0, 10),
      cashierName: cashierName.trim() || 'Kasir',
      systemCashExpected: todayCashCalculation.expectedCash,
      physicalCashActual: todayCashCalculation.physicalTotal,
      difference: todayCashCalculation.difference,
      denominations,
      totalSalesCash: todayCashCalculation.salesCash,
      totalExpensesCash: todayCashCalculation.expensesCash,
      totalManualInCash: todayCashCalculation.manualInCash,
      totalManualOutCash: todayCashCalculation.manualOutCash,
      notes: closingNotes.trim() || 'Tutup kas harian selesai dilakukan.',
    });

    setClosingSuccessDialog(newRecord);
  };

  return (
    <div id="bookkeeping-container" className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-slate-800 tracking-tight">
              Buku Kas & Pembukuan Warung
            </h1>
            <p className="text-sm text-slate-500">
              Pencatatan mutasi kas, arus kas SAK EMKM, dan rekonsiliasi tutup laci kasir
            </p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            id="btn-open-income-entry"
            onClick={() => {
              setEntryType('KAS_MASUK');
              setEntryCategory('Modal Awal / Tambahan Modal');
              setIsEntryModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold shadow-xs transition-colors"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Kas Masuk</span>
          </button>
          <button
            id="btn-open-expense-entry"
            onClick={() => {
              setEntryType('KAS_KELUAR');
              setEntryCategory('Prive / Penarikan Pemilik');
              setIsEntryModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold shadow-xs transition-colors"
          >
            <MinusCircle className="w-4 h-4" />
            <span>Kas Keluar</span>
          </button>
        </div>
      </div>

      {/* Sub-Navigation Tabs */}
      <div className="flex border-b border-slate-200 bg-white rounded-xl p-1.5 shadow-2xs gap-1">
        <button
          id="tab-btn-ledger"
          onClick={() => setActiveTab('ledger')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-sm font-semibold transition-all ${
            activeTab === 'ledger'
              ? 'bg-amber-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>Buku Kas & Jurnal Mutasi</span>
        </button>

        <button
          id="tab-btn-closing"
          onClick={() => setActiveTab('closing')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-sm font-semibold transition-all ${
            activeTab === 'closing'
              ? 'bg-amber-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Calculator className="w-4 h-4" />
          <span>Tutup Kas & Opname Laci</span>
        </button>

        <button
          id="tab-btn-cashflow"
          onClick={() => setActiveTab('cash_flow')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-sm font-semibold transition-all ${
            activeTab === 'cash_flow'
              ? 'bg-amber-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          <span>Laporan Arus Kas</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: BUKU KAS & JURNAL MUTASI */}
      {/* ========================================================================= */}
      {activeTab === 'ledger' && (
        <div className="space-y-6">
          {/* Account Balance Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Kas Tunai Laci */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">Saldo Kas Tunai (Laci)</span>
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <Wallet className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <p className="text-xl font-extrabold text-slate-800">{formatRupiah(accountBalances.cashInDrawer)}</p>
                <p className="text-xs text-slate-400 mt-0.5">Uang fisik di tempat kasir</p>
              </div>
            </div>

            {/* Rekening Bank */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">Saldo Bank Transfer</span>
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Building2 className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <p className="text-xl font-extrabold text-slate-800">{formatRupiah(accountBalances.bankTransfer)}</p>
                <p className="text-xs text-slate-400 mt-0.5">{storeSettings.bankInfo || 'Rekening usaha'}</p>
              </div>
            </div>

            {/* QRIS */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">Saldo QRIS Terkumpul</span>
                <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                  <QrCode className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <p className="text-xl font-extrabold text-slate-800">{formatRupiah(accountBalances.qrisBalance)}</p>
                <p className="text-xs text-slate-400 mt-0.5">{storeSettings.qrisInfo || 'QRIS HannaBee'}</p>
              </div>
            </div>

            {/* Total Saldo Keseluruhan */}
            <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white p-4 rounded-2xl shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-300">Total Kas Keseluruhan</span>
                <div className="w-8 h-8 rounded-lg bg-white/10 text-amber-300 flex items-center justify-center">
                  <DollarSign className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <p className="text-xl font-extrabold text-amber-300">{formatRupiah(accountBalances.totalNetCash)}</p>
                <p className="text-xs text-slate-300 mt-0.5">Akumulasi seluruh saluran kas</p>
              </div>
            </div>
          </div>

          {/* Filter Bar & Export Actions */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              {/* Period Quick Select */}
              <div className="flex flex-wrap items-center gap-1.5">
                {(['today', '7days', 'this_month', 'last_month', 'custom'] as PeriodOption[]).map(opt => (
                  <button
                    key={opt}
                    onClick={() => setPeriodOption(opt)}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                      periodOption === opt
                        ? 'bg-amber-600 text-white shadow-2xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {opt === 'today' && 'Hari Ini'}
                    {opt === '7days' && '7 Hari'}
                    {opt === 'this_month' && 'Bulan Ini'}
                    {opt === 'last_month' && 'Bulan Lalu'}
                    {opt === 'custom' && 'Pilih Tanggal'}
                  </button>
                ))}
              </div>

              {/* Export Buttons */}
              <div className="flex items-center gap-2">
                <button
                  id="btn-export-excel-bookkeeping"
                  onClick={() => exportBookkeepingToExcel(allFilteredEntries, storeSettings, periodLabel)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 text-xs font-semibold transition-colors"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Excel</span>
                </button>
                <button
                  id="btn-export-pdf-bookkeeping"
                  onClick={() => exportBookkeepingToPDF(allFilteredEntries, storeSettings, periodLabel)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 text-xs font-semibold transition-colors"
                >
                  <Printer className="w-3.5 h-3.5 text-blue-600" />
                  <span>Cetak PDF</span>
                </button>
              </div>
            </div>

            {/* Custom Date Inputs if 'custom' selected */}
            {periodOption === 'custom' && (
              <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-100">
                <div className="flex items-center gap-2">
                  <label className="text-xs text-slate-500 font-medium">Dari:</label>
                  <input
                    type="date"
                    value={customStartDate}
                    onChange={e => setCustomStartDate(e.target.value)}
                    className="px-2.5 py-1 text-xs rounded-lg border border-slate-200 focus:outline-hidden focus:ring-1 focus:ring-amber-500"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-xs text-slate-500 font-medium">Sampai:</label>
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={e => setCustomEndDate(e.target.value)}
                    className="px-2.5 py-1 text-xs rounded-lg border border-slate-200 focus:outline-hidden focus:ring-1 focus:ring-amber-500"
                  />
                </div>
              </div>
            )}

            {/* Sub-Filters: Account, In/Out Type, and Search */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-100">
              {/* Account Filter */}
              <div>
                <select
                  value={selectedAccount}
                  onChange={e => setSelectedAccount(e.target.value as any)}
                  className="w-full px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-amber-500"
                >
                  <option value="ALL">Semua Saluran Kas (Semua Akun)</option>
                  <option value="KAS_TUNAI">Kas Tunai (Laci)</option>
                  <option value="BANK_TRANSFER">Rekening Bank</option>
                  <option value="QRIS">QRIS</option>
                  <option value="SALDO_DEPOSIT">Saldo Deposit</option>
                </select>
              </div>

              {/* In/Out Filter */}
              <div>
                <select
                  value={selectedType}
                  onChange={e => setSelectedType(e.target.value as any)}
                  className="w-full px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-amber-500"
                >
                  <option value="ALL">Semua Mutasi (Masuk & Keluar)</option>
                  <option value="KAS_MASUK">Hanya Kas Masuk (+ Debit)</option>
                  <option value="KAS_KELUAR">Hanya Kas Keluar (- Kredit)</option>
                </select>
              </div>

              {/* Search */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  placeholder="Cari transaksi, kategori, atau nama..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-hidden focus:ring-1 focus:ring-amber-500"
                />
              </div>
            </div>
          </div>

          {/* Period Inflow / Outflow Summary Banner */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-emerald-50/70 border border-emerald-200/60 p-3.5 rounded-xl flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-emerald-800">Total Kas Masuk ({periodLabel})</p>
                <p className="text-lg font-bold text-emerald-700 mt-0.5">{formatRupiah(accountBalances.periodIn)}</p>
              </div>
              <ArrowDownLeft className="w-6 h-6 text-emerald-600 bg-emerald-100 rounded-lg p-1" />
            </div>

            <div className="bg-rose-50/70 border border-rose-200/60 p-3.5 rounded-xl flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-rose-800">Total Kas Keluar ({periodLabel})</p>
                <p className="text-lg font-bold text-rose-700 mt-0.5">{formatRupiah(accountBalances.periodOut)}</p>
              </div>
              <ArrowUpRight className="w-6 h-6 text-rose-600 bg-rose-100 rounded-lg p-1" />
            </div>

            <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-700">Selisih Kas Bersih Periode</p>
                <p className={`text-lg font-bold mt-0.5 ${accountBalances.periodIn - accountBalances.periodOut >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                  {formatRupiah(accountBalances.periodIn - accountBalances.periodOut)}
                </p>
              </div>
              <Coins className="w-6 h-6 text-slate-600 bg-slate-200 rounded-lg p-1" />
            </div>
          </div>

          {/* Ledger Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-800 text-sm">Buku Mutasi Kas & Jurnal Transaksi</h3>
                <p className="text-xs text-slate-400">Menampilkan {allFilteredEntries.length} baris pencatatan</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Tanggal & Jam</th>
                    <th className="py-3 px-4">Tipe & Kategori</th>
                    <th className="py-3 px-4">Keterangan / Rincian</th>
                    <th className="py-3 px-4">Saluran Kas</th>
                    <th className="py-3 px-4 text-right">Kas Masuk (Debit)</th>
                    <th className="py-3 px-4 text-right">Kas Keluar (Kredit)</th>
                    <th className="py-3 px-4 text-right">Saldo Berjalan</th>
                    <th className="py-3 px-4 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {allFilteredEntries.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400">
                        <BookOpen className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                        <p className="font-medium">Belum ada mutasi kas pada periode & filter ini</p>
                        <p className="text-xs mt-1">Gunakan tombol 'Kas Masuk' atau 'Kas Keluar' untuk mencatat transaksi manual</p>
                      </td>
                    </tr>
                  ) : (
                    allFilteredEntries.map((item, idx) => (
                      <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                          {formatDate(item.timestamp)}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex flex-col">
                            <span
                              className={`inline-flex items-center gap-1 font-semibold text-[11px] px-2 py-0.5 rounded-md w-max ${
                                item.type === 'KAS_MASUK'
                                  ? 'bg-emerald-50 text-emerald-700'
                                  : 'bg-rose-50 text-rose-700'
                              }`}
                            >
                              {item.type === 'KAS_MASUK' ? <ArrowDownLeft className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3" />}
                              {item.type === 'KAS_MASUK' ? 'MASUK' : 'KELUAR'}
                            </span>
                            <span className="text-slate-700 font-medium mt-0.5 text-xs">{item.category}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 max-w-xs">
                          <p className="font-semibold text-slate-800">{item.title}</p>
                          {item.notes && <p className="text-slate-400 text-[11px] truncate mt-0.5">{item.notes}</p>}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className="px-2 py-0.5 text-[11px] rounded-md bg-slate-100 text-slate-700 font-medium">
                            {item.accountLabel}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-emerald-600 whitespace-nowrap">
                          {item.type === 'KAS_MASUK' ? formatRupiah(item.amount) : '-'}
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-rose-600 whitespace-nowrap">
                          {item.type === 'KAS_KELUAR' ? formatRupiah(item.amount) : '-'}
                        </td>
                        <td className="py-3 px-4 text-right font-extrabold text-slate-800 whitespace-nowrap">
                          {item.runningBalance !== undefined ? formatRupiah(item.runningBalance) : '-'}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {item.referenceType === 'MANUAL' && (
                            <button
                              onClick={() => {
                                if (window.confirm(`Hapus catatan pembukuan "${item.title}"?`)) {
                                  deleteManualJournalEntry(item.id);
                                }
                              }}
                              className="p-1.5 text-slate-400 hover:text-rose-600 rounded-md hover:bg-rose-50 transition-colors"
                              title="Hapus Jurnal Manual"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: TUTUP KAS & OPNAME LACI (CASH RECONCILIATION) */}
      {/* ========================================================================= */}
      {activeTab === 'closing' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left 2 Cols: Calculator Cash Drawer */}
            <div className="lg:col-span-2 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                    <Calculator className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 text-base">Hitung Uang Fisik di Laci Kasir</h3>
                    <p className="text-xs text-slate-400">Masukkan jumlah lembar dan koin fisik pada akhir shift / hari ini</p>
                  </div>
                </div>
                <button
                  onClick={() =>
                    setDenominations({
                      k100000: 0,
                      k50000: 0,
                      k20000: 0,
                      k10000: 0,
                      k5000: 0,
                      k2000: 0,
                      k1000: 0,
                      coins: 0,
                    })
                  }
                  className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1 font-medium"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Reset Hitungan</span>
                </button>
              </div>

              {/* Denomination Inputs Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* 100.000 */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-slate-800 text-sm">Rp 100.000</span>
                    <p className="text-[11px] text-slate-400">Total: {formatRupiah((denominations.k100000 || 0) * 100000)}</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      min="0"
                      value={denominations.k100000 || ''}
                      onChange={e => setDenominations(p => ({ ...p, k100000: Math.max(0, parseInt(e.target.value) || 0) }))}
                      placeholder="0"
                      className="w-20 px-2.5 py-1.5 text-right font-bold text-slate-800 bg-white border border-slate-200 rounded-lg text-sm focus:outline-hidden focus:ring-1 focus:ring-amber-500"
                    />
                    <span className="text-xs text-slate-500 font-medium">lbr</span>
                  </div>
                </div>

                {/* 50.000 */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-slate-800 text-sm">Rp 50.000</span>
                    <p className="text-[11px] text-slate-400">Total: {formatRupiah((denominations.k50000 || 0) * 50000)}</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      min="0"
                      value={denominations.k50000 || ''}
                      onChange={e => setDenominations(p => ({ ...p, k50000: Math.max(0, parseInt(e.target.value) || 0) }))}
                      placeholder="0"
                      className="w-20 px-2.5 py-1.5 text-right font-bold text-slate-800 bg-white border border-slate-200 rounded-lg text-sm focus:outline-hidden focus:ring-1 focus:ring-amber-500"
                    />
                    <span className="text-xs text-slate-500 font-medium">lbr</span>
                  </div>
                </div>

                {/* 20.000 */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-slate-800 text-sm">Rp 20.000</span>
                    <p className="text-[11px] text-slate-400">Total: {formatRupiah((denominations.k20000 || 0) * 20000)}</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      min="0"
                      value={denominations.k20000 || ''}
                      onChange={e => setDenominations(p => ({ ...p, k20000: Math.max(0, parseInt(e.target.value) || 0) }))}
                      placeholder="0"
                      className="w-20 px-2.5 py-1.5 text-right font-bold text-slate-800 bg-white border border-slate-200 rounded-lg text-sm focus:outline-hidden focus:ring-1 focus:ring-amber-500"
                    />
                    <span className="text-xs text-slate-500 font-medium">lbr</span>
                  </div>
                </div>

                {/* 10.000 */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-slate-800 text-sm">Rp 10.000</span>
                    <p className="text-[11px] text-slate-400">Total: {formatRupiah((denominations.k10000 || 0) * 10000)}</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      min="0"
                      value={denominations.k10000 || ''}
                      onChange={e => setDenominations(p => ({ ...p, k10000: Math.max(0, parseInt(e.target.value) || 0) }))}
                      placeholder="0"
                      className="w-20 px-2.5 py-1.5 text-right font-bold text-slate-800 bg-white border border-slate-200 rounded-lg text-sm focus:outline-hidden focus:ring-1 focus:ring-amber-500"
                    />
                    <span className="text-xs text-slate-500 font-medium">lbr</span>
                  </div>
                </div>

                {/* 5.000 */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-slate-800 text-sm">Rp 5.000</span>
                    <p className="text-[11px] text-slate-400">Total: {formatRupiah((denominations.k5000 || 0) * 5000)}</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      min="0"
                      value={denominations.k5000 || ''}
                      onChange={e => setDenominations(p => ({ ...p, k5000: Math.max(0, parseInt(e.target.value) || 0) }))}
                      placeholder="0"
                      className="w-20 px-2.5 py-1.5 text-right font-bold text-slate-800 bg-white border border-slate-200 rounded-lg text-sm focus:outline-hidden focus:ring-1 focus:ring-amber-500"
                    />
                    <span className="text-xs text-slate-500 font-medium">lbr</span>
                  </div>
                </div>

                {/* 2.000 */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-slate-800 text-sm">Rp 2.000</span>
                    <p className="text-[11px] text-slate-400">Total: {formatRupiah((denominations.k2000 || 0) * 2000)}</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      min="0"
                      value={denominations.k2000 || ''}
                      onChange={e => setDenominations(p => ({ ...p, k2000: Math.max(0, parseInt(e.target.value) || 0) }))}
                      placeholder="0"
                      className="w-20 px-2.5 py-1.5 text-right font-bold text-slate-800 bg-white border border-slate-200 rounded-lg text-sm focus:outline-hidden focus:ring-1 focus:ring-amber-500"
                    />
                    <span className="text-xs text-slate-500 font-medium">lbr</span>
                  </div>
                </div>

                {/* 1.000 */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-slate-800 text-sm">Rp 1.000</span>
                    <p className="text-[11px] text-slate-400">Total: {formatRupiah((denominations.k1000 || 0) * 1000)}</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      min="0"
                      value={denominations.k1000 || ''}
                      onChange={e => setDenominations(p => ({ ...p, k1000: Math.max(0, parseInt(e.target.value) || 0) }))}
                      placeholder="0"
                      className="w-20 px-2.5 py-1.5 text-right font-bold text-slate-800 bg-white border border-slate-200 rounded-lg text-sm focus:outline-hidden focus:ring-1 focus:ring-amber-500"
                    />
                    <span className="text-xs text-slate-500 font-medium">lbr</span>
                  </div>
                </div>

                {/* Total Uang Koin */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-slate-800 text-sm">Uang Koin Logam (Total Rp)</span>
                    <p className="text-[11px] text-slate-400">Pecahan 100, 200, 500, 1000</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      min="0"
                      step="500"
                      value={denominations.coins || ''}
                      onChange={e => setDenominations(p => ({ ...p, coins: Math.max(0, parseInt(e.target.value) || 0) }))}
                      placeholder="0"
                      className="w-24 px-2.5 py-1.5 text-right font-bold text-slate-800 bg-white border border-slate-200 rounded-lg text-sm focus:outline-hidden focus:ring-1 focus:ring-amber-500"
                    />
                    <span className="text-xs text-slate-500 font-medium">Rp</span>
                  </div>
                </div>
              </div>

              {/* Cashier Name & Notes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Kasir Bertugas</label>
                  <input
                    type="text"
                    value={cashierName}
                    onChange={e => setCashierName(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:ring-1 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Catatan Serah Terima / Shift</label>
                  <input
                    type="text"
                    placeholder="Contoh: Shift 1 selesai, laci kasir rapi."
                    value={closingNotes}
                    onChange={e => setClosingNotes(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:ring-1 focus:ring-amber-500"
                  />
                </div>
              </div>
            </div>

            {/* Right 1 Col: Reconciliation Summary & Final Action */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-600" />
                  <span>Rekapitulasi Tutup Kas</span>
                </h3>

                <div className="space-y-2.5 text-xs text-slate-600">
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span>Penjualan Kasir Hari Ini (Tunai):</span>
                    <span className="font-semibold text-slate-800">{formatRupiah(todayCashCalculation.salesCash)}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span>Kas Masuk Manual Hari Ini:</span>
                    <span className="font-semibold text-emerald-600">+{formatRupiah(todayCashCalculation.manualInCash)}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span>Pengeluaran Kas Hari Ini:</span>
                    <span className="font-semibold text-rose-600">-{formatRupiah(todayCashCalculation.expensesCash + todayCashCalculation.manualOutCash)}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b-2 border-slate-200 font-bold text-sm text-slate-800">
                    <span>Saldo Kas Sistem Tercatat:</span>
                    <span>{formatRupiah(todayCashCalculation.expectedCash)}</span>
                  </div>
                  <div className="flex justify-between py-2 font-extrabold text-sm text-slate-900 bg-slate-50 px-3 rounded-lg">
                    <span>Total Uang Fisik Dihitung:</span>
                    <span className="text-amber-600">{formatRupiah(todayCashCalculation.physicalTotal)}</span>
                  </div>
                </div>

                {/* Status Match Box */}
                <div
                  className={`p-4 rounded-xl border flex items-start gap-3 ${
                    todayCashCalculation.difference === 0
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                      : todayCashCalculation.difference > 0
                      ? 'bg-blue-50 border-blue-200 text-blue-900'
                      : 'bg-rose-50 border-rose-200 text-rose-900'
                  }`}
                >
                  {todayCashCalculation.difference === 0 ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <p className="font-bold text-sm">
                      {todayCashCalculation.difference === 0
                        ? 'Saldo Kas Sesuai (Cocok)'
                        : todayCashCalculation.difference > 0
                        ? `Selisih Lebih: +${formatRupiah(todayCashCalculation.difference)}`
                        : `Selisih Kurang: ${formatRupiah(todayCashCalculation.difference)}`}
                    </p>
                    <p className="text-xs mt-0.5 opacity-90">
                      {todayCashCalculation.difference === 0
                        ? 'Jumlah uang fisik di laci kasir persis cocok dengan pencatatan sistem.'
                        : todayCashCalculation.difference > 0
                        ? 'Terdapat uang fisik lebih banyak di laci dibanding catatan sistem.'
                        : 'Uang fisik di laci kasir kurang dari catatan sistem. Harap periksa kembali uang kembalian atau pengeluaran.'}
                    </p>
                  </div>
                </div>
              </div>

              <button
                id="btn-save-cash-closing"
                onClick={handleSaveCashClosing}
                className="w-full py-3 px-4 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Simpan Rekap Tutup Kas</span>
              </button>
            </div>
          </div>

          {/* History of Cash Closings */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-slate-500" />
                <h3 className="font-bold text-slate-800 text-sm">Riwayat Rekap Tutup Kas Harian</h3>
              </div>
              <span className="text-xs text-slate-400">{cashClosings.length} rekaman tersimpan</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase">
                  <tr>
                    <th className="py-3 px-4">Tanggal & Jam</th>
                    <th className="py-3 px-4">Kasir Bertugas</th>
                    <th className="py-3 px-4 text-right">Kas Sistem</th>
                    <th className="py-3 px-4 text-right">Uang Fisik Laci</th>
                    <th className="py-3 px-4 text-center">Status Selisih</th>
                    <th className="py-3 px-4">Catatan</th>
                    <th className="py-3 px-4 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {cashClosings.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400">
                        Belum ada riwayat tutup kas yang tersimpan.
                      </td>
                    </tr>
                  ) : (
                    cashClosings.map(c => (
                      <tr key={c.id} className="hover:bg-slate-50/70">
                        <td className="py-3 px-4 whitespace-nowrap font-medium text-slate-700">
                          {formatDate(c.timestamp)}
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-800">{c.cashierName}</td>
                        <td className="py-3 px-4 text-right font-medium text-slate-600">
                          {formatRupiah(c.systemCashExpected)}
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-slate-900">
                          {formatRupiah(c.physicalCashActual)}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-md font-semibold text-[11px] ${
                              c.difference === 0
                                ? 'bg-emerald-50 text-emerald-700'
                                : c.difference > 0
                                ? 'bg-blue-50 text-blue-700'
                                : 'bg-rose-50 text-rose-700'
                            }`}
                          >
                            {c.difference === 0
                              ? 'PAS (COCOK)'
                              : c.difference > 0
                              ? `+${formatRupiah(c.difference)}`
                              : `${formatRupiah(c.difference)}`}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-500 max-w-xs truncate">{c.notes || '-'}</td>
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => exportCashClosingToPDF(c, storeSettings)}
                              className="p-1.5 text-slate-500 hover:text-blue-600 rounded-md hover:bg-blue-50"
                              title="Cetak Berita Acara PDF"
                            >
                              <Printer className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => {
                                if (window.confirm('Hapus arsip rekap tutup kas ini?')) {
                                  deleteCashClosingRecord(c.id);
                                }
                              }}
                              className="p-1.5 text-slate-400 hover:text-rose-600 rounded-md hover:bg-rose-50"
                              title="Hapus Rekap"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: LAPORAN ARUS KAS (CASH FLOW STATEMENT) */}
      {/* ========================================================================= */}
      {activeTab === 'cash_flow' && (
        <div className="space-y-6">
          {/* Controls */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-1.5">
              {(['today', '7days', 'this_month', 'last_month', 'custom'] as PeriodOption[]).map(opt => (
                <button
                  key={opt}
                  onClick={() => setPeriodOption(opt)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                    periodOption === opt
                      ? 'bg-amber-600 text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {opt === 'today' && 'Hari Ini'}
                  {opt === '7days' && '7 Hari'}
                  {opt === 'this_month' && 'Bulan Ini'}
                  {opt === 'last_month' && 'Bulan Lalu'}
                  {opt === 'custom' && 'Pilih Tanggal'}
                </button>
              ))}
            </div>

            <button
              id="btn-export-pdf-cashflow"
              onClick={() => exportCashFlowToPDF(cashFlowData, storeSettings)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 text-xs font-semibold shadow-2xs"
            >
              <Printer className="w-3.5 h-3.5 text-blue-600" />
              <span>Cetak Laporan Arus Kas (PDF)</span>
            </button>
          </div>

          {/* Cash Flow Statement Sheet */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-5 border-b border-slate-100 bg-slate-50/50">
              <h2 className="text-base font-bold text-slate-800">Laporan Arus Kas (Cash Flow Statement)</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Standar Akuntansi Keuangan EMKM - Periode: {cashFlowData.periodLabel} ({formatDateOnly(cashFlowData.startDate)} s/d {formatDateOnly(cashFlowData.endDate)})
              </p>
            </div>

            <div className="p-5 space-y-6 text-xs text-slate-700">
              {/* Saldo Awal */}
              <div className="flex justify-between items-center py-2.5 px-3 bg-slate-100/70 rounded-xl font-bold text-slate-800">
                <span className="uppercase tracking-wide text-[11px]">Saldo Kas Awal Periode</span>
                <span className="text-sm">{formatRupiah(cashFlowData.initialCashBalance)}</span>
              </div>

              {/* A. Aktivitas Operasional */}
              <div className="space-y-2">
                <div className="flex justify-between items-center pb-1 border-b border-slate-200 font-bold text-slate-900 text-xs">
                  <span>A. ARUS KAS DARI AKTIVITAS OPERASIONAL</span>
                </div>
                <div className="pl-3 space-y-1.5 text-slate-600">
                  <div className="flex justify-between">
                    <span>(+) Penerimaan Penjualan Kasir (Tunai)</span>
                    <span className="font-semibold text-slate-800">{formatRupiah(cashFlowData.operatingInflows.salesCash)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>(+) Penerimaan Penjualan Kasir (Non-Tunai / QRIS / Transfer)</span>
                    <span className="font-semibold text-slate-800">{formatRupiah(cashFlowData.operatingInflows.salesNonCash)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>(+) Penerimaan Pelunasan Kasbon Pelanggan</span>
                    <span className="font-semibold text-slate-800">{formatRupiah(cashFlowData.operatingInflows.debtSettlements)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>(+) Penerimaan Top-Up Saldo Deposit Pelanggan</span>
                    <span className="font-semibold text-slate-800">{formatRupiah(cashFlowData.operatingInflows.depositTopUps)}</span>
                  </div>
                  {cashFlowData.operatingInflows.otherOperating > 0 && (
                    <div className="flex justify-between">
                      <span>(+) Pendapatan Operasional Lainnya</span>
                      <span className="font-semibold text-slate-800">{formatRupiah(cashFlowData.operatingInflows.otherOperating)}</span>
                    </div>
                  )}
                  <div className="flex justify-between pt-1 border-t border-slate-100 font-semibold text-emerald-700">
                    <span>Total Penerimaan Kas Operasional</span>
                    <span>{formatRupiah(cashFlowData.operatingInflows.total)}</span>
                  </div>

                  <div className="pt-2 space-y-1.5">
                    <div className="flex justify-between text-slate-600">
                      <span>(-) Pembayaran Belanja Bahan Baku</span>
                      <span className="font-semibold text-rose-600">({formatRupiah(cashFlowData.operatingOutflows.materials)})</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>(-) Pembayaran Beban Operasional, Gas & Listrik</span>
                      <span className="font-semibold text-rose-600">({formatRupiah(cashFlowData.operatingOutflows.operationalUtilities)})</span>
                    </div>
                    {cashFlowData.operatingOutflows.salaries > 0 && (
                      <div className="flex justify-between text-slate-600">
                        <span>(-) Pembayaran Gaji & Upah Karyawan</span>
                        <span className="font-semibold text-rose-600">({formatRupiah(cashFlowData.operatingOutflows.salaries)})</span>
                      </div>
                    )}
                    {cashFlowData.operatingOutflows.rent > 0 && (
                      <div className="flex justify-between text-slate-600">
                        <span>(-) Pembayaran Sewa Tempat & Bangunan</span>
                        <span className="font-semibold text-rose-600">({formatRupiah(cashFlowData.operatingOutflows.rent)})</span>
                      </div>
                    )}
                    {cashFlowData.operatingOutflows.packaging > 0 && (
                      <div className="flex justify-between text-slate-600">
                        <span>(-) Pembelian Kemasan & Peralatan Habis Pakai</span>
                        <span className="font-semibold text-rose-600">({formatRupiah(cashFlowData.operatingOutflows.packaging)})</span>
                      </div>
                    )}
                    {cashFlowData.operatingOutflows.otherExpenses > 0 && (
                      <div className="flex justify-between text-slate-600">
                        <span>(-) Beban Pengeluaran Lainnya</span>
                        <span className="font-semibold text-rose-600">({formatRupiah(cashFlowData.operatingOutflows.otherExpenses)})</span>
                      </div>
                    )}
                    <div className="flex justify-between pt-1 border-t border-slate-100 font-semibold text-rose-700">
                      <span>Total Pengeluaran Kas Operasional</span>
                      <span>({formatRupiah(cashFlowData.operatingOutflows.total)})</span>
                    </div>
                  </div>
                </div>

                <div className="flex justify-between items-center py-2 px-3 bg-slate-50 rounded-lg font-bold text-slate-800 mt-2">
                  <span>Arus Kas Bersih dari Aktivitas Operasional</span>
                  <span className={cashFlowData.netOperatingCashFlow >= 0 ? 'text-emerald-700' : 'text-rose-700'}>
                    {formatRupiah(cashFlowData.netOperatingCashFlow)}
                  </span>
                </div>
              </div>

              {/* B. Aktivitas Investasi */}
              <div className="space-y-2">
                <div className="flex justify-between items-center pb-1 border-b border-slate-200 font-bold text-slate-900 text-xs">
                  <span>B. ARUS KAS DARI AKTIVITAS INVESTASI</span>
                </div>
                <div className="pl-3 space-y-1.5 text-slate-600">
                  <div className="flex justify-between">
                    <span>(-) Pembelian Peralatan & Aset Warung Jangka Panjang</span>
                    <span className="font-semibold text-rose-600">
                      {cashFlowData.investingOutflows.assetsAndEquipment > 0
                        ? `(${formatRupiah(cashFlowData.investingOutflows.assetsAndEquipment)})`
                        : 'Rp 0'}
                    </span>
                  </div>
                </div>
                <div className="flex justify-between items-center py-2 px-3 bg-slate-50 rounded-lg font-bold text-slate-800">
                  <span>Arus Kas Bersih dari Aktivitas Investasi</span>
                  <span className={cashFlowData.netInvestingCashFlow >= 0 ? 'text-slate-800' : 'text-rose-700'}>
                    {formatRupiah(cashFlowData.netInvestingCashFlow)}
                  </span>
                </div>
              </div>

              {/* C. Aktivitas Pendanaan */}
              <div className="space-y-2">
                <div className="flex justify-between items-center pb-1 border-b border-slate-200 font-bold text-slate-900 text-xs">
                  <span>C. ARUS KAS DARI AKTIVITAS PENDANAAN</span>
                </div>
                <div className="pl-3 space-y-1.5 text-slate-600">
                  <div className="flex justify-between">
                    <span>(+) Setoran Modal Usaha Pemilik</span>
                    <span className="font-semibold text-emerald-600">{formatRupiah(cashFlowData.financingInflows.capitalInjections)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>(-) Prive / Penarikan Kas Pemilik</span>
                    <span className="font-semibold text-rose-600">
                      {cashFlowData.financingOutflows.ownerDrawingsPrive > 0
                        ? `(${formatRupiah(cashFlowData.financingOutflows.ownerDrawingsPrive)})`
                        : 'Rp 0'}
                    </span>
                  </div>
                </div>
                <div className="flex justify-between items-center py-2 px-3 bg-slate-50 rounded-lg font-bold text-slate-800">
                  <span>Arus Kas Bersih dari Aktivitas Pendanaan</span>
                  <span className={cashFlowData.netFinancingCashFlow >= 0 ? 'text-emerald-700' : 'text-rose-700'}>
                    {formatRupiah(cashFlowData.netFinancingCashFlow)}
                  </span>
                </div>
              </div>

              {/* D. Rekapitulasi Akhir */}
              <div className="space-y-2 pt-3 border-t-2 border-slate-200">
                <div className="flex justify-between items-center py-2 px-3 bg-slate-100 rounded-lg font-bold text-slate-800">
                  <span>Kenaikan / (Penurunan) Kas Bersih Periode Ini</span>
                  <span className={cashFlowData.netCashChange >= 0 ? 'text-emerald-700' : 'text-rose-700'}>
                    {formatRupiah(cashFlowData.netCashChange)}
                  </span>
                </div>

                <div className="flex justify-between items-center py-3 px-4 bg-slate-900 text-white rounded-xl font-extrabold text-sm shadow-xs">
                  <span className="tracking-wide">SALDO KAS AKHIR PERIODE</span>
                  <span className="text-amber-300 text-base">{formatRupiah(cashFlowData.endingCashBalance)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL CATAT KAS MASUK / KELUAR */}
      {/* ========================================================================= */}
      {isEntryModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-4 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold ${
                    entryType === 'KAS_MASUK' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                  }`}
                >
                  {entryType === 'KAS_MASUK' ? <PlusCircle className="w-5 h-5" /> : <MinusCircle className="w-5 h-5" />}
                </div>
                <h3 className="font-bold text-slate-800 text-base">
                  {entryType === 'KAS_MASUK' ? 'Catat Kas Masuk (Pemasukan)' : 'Catat Kas Keluar (Pengeluaran)'}
                </h3>
              </div>
              <button onClick={() => setIsEntryModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveManualEntry} className="space-y-4">
              {/* Type Switcher */}
              <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl">
                <button
                  type="button"
                  onClick={() => {
                    setEntryType('KAS_MASUK');
                    setEntryCategory('Modal Awal / Tambahan Modal');
                  }}
                  className={`py-2 text-xs font-bold rounded-lg transition-all ${
                    entryType === 'KAS_MASUK' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  + Kas Masuk
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEntryType('KAS_KELUAR');
                    setEntryCategory('Prive / Penarikan Pemilik');
                  }}
                  className={`py-2 text-xs font-bold rounded-lg transition-all ${
                    entryType === 'KAS_KELUAR' ? 'bg-rose-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  - Kas Keluar
                </button>
              </div>

              {/* Category */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Kategori Pembukuan</label>
                <select
                  value={entryCategory}
                  onChange={e => setEntryCategory(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:outline-hidden focus:ring-1 focus:ring-amber-500"
                >
                  {entryType === 'KAS_MASUK' ? (
                    <>
                      <option value="Modal Awal / Tambahan Modal">Modal Awal / Tambahan Modal Usaha</option>
                      <option value="Pendapatan Lain-lain">Pendapatan Lain-lain (Komisi/Titipan/Cashback)</option>
                      <option value="Pelunasan Kasbon">Pelunasan Piutang / Kasbon Lama</option>
                      <option value="Top-Up Saldo Deposit">Top-Up Saldo Deposit</option>
                      <option value="Pengembalian Biaya (Refund)">Pengembalian Biaya / Refund Masuk</option>
                    </>
                  ) : (
                    <>
                      <option value="Prive / Penarikan Pemilik">Prive / Penarikan Kas Pemilik</option>
                      <option value="Setor Kas ke Bank">Setor Kas Fisik ke Rekening Bank</option>
                      <option value="Pembelian Aset / Perlengkapan">Pembelian Peralatan / Aset Warung</option>
                      <option value="Belanja Bahan Baku">Belanja Bahan Baku Tambahan</option>
                      <option value="Operasional & Listrik">Operasional, Gas & Listrik</option>
                      <option value="Gaji & Uang Makan Karyawan">Gaji / Upah / Bonus Karyawan</option>
                      <option value="Pengeluaran Lain-lain">Pengeluaran Lain-lain / Tak Terduga</option>
                    </>
                  )}
                </select>
              </div>

              {/* Account / Channel */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Saluran Kas / Akun</label>
                <select
                  value={entryAccount}
                  onChange={e => setEntryAccount(e.target.value as CashAccountType)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:outline-hidden focus:ring-1 focus:ring-amber-500"
                >
                  <option value="KAS_TUNAI">Kas Tunai (Laci Kasir)</option>
                  <option value="BANK_TRANSFER">Rekening Bank</option>
                  <option value="QRIS">QRIS</option>
                </select>
              </div>

              {/* Nominal Amount */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nominal (Rp)</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: 500000"
                  value={entryAmount}
                  onChange={e => {
                    const clean = e.target.value.replace(/\D/g, '');
                    setEntryAmount(clean ? parseInt(clean).toLocaleString('id-ID') : '');
                  }}
                  className="w-full px-3 py-2 text-base font-bold text-slate-800 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-1 focus:ring-amber-500"
                />
              </div>

              {/* Title / Description */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Keterangan / Judul Transaksi</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Tambah modal kas awal laci"
                  value={entryTitle}
                  onChange={e => setEntryTitle(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:ring-1 focus:ring-amber-500"
                />
              </div>

              {/* Related Party / Person */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Pihak Terkait / Sumber / Penerima (Opsional)</label>
                <input
                  type="text"
                  placeholder="Contoh: Pemilik Warung (Iyan)"
                  value={entryParty}
                  onChange={e => setEntryParty(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:ring-1 focus:ring-amber-500"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Catatan Tambahan (Opsional)</label>
                <textarea
                  rows={2}
                  placeholder="Catatan detail lainnya..."
                  value={entryNotes}
                  onChange={e => setEntryNotes(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:ring-1 focus:ring-amber-500"
                />
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEntryModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className={`px-5 py-2 rounded-xl text-xs font-bold text-white shadow-xs ${
                    entryType === 'KAS_MASUK' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'
                  }`}
                >
                  Simpan Catatan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUCCESS CASH CLOSING POPUP */}
      {/* ========================================================================= */}
      {closingSuccessDialog && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4 animate-in fade-in zoom-in duration-150">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="font-bold text-slate-800 text-base">Rekap Tutup Kas Berhasil Disimpan</h3>
              <p className="text-xs text-slate-500">
                Berita acara opname laci kasir per tanggal {formatDateOnly(closingSuccessDialog.timestamp)} telah tercatat dalam riwayat pembukuan.
              </p>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl space-y-1.5 text-xs text-slate-700 border border-slate-200">
              <div className="flex justify-between">
                <span>Kasir Bertugas:</span>
                <span className="font-semibold">{closingSuccessDialog.cashierName}</span>
              </div>
              <div className="flex justify-between">
                <span>Kas Sistem:</span>
                <span className="font-semibold">{formatRupiah(closingSuccessDialog.systemCashExpected)}</span>
              </div>
              <div className="flex justify-between">
                <span>Uang Fisik Dihitung:</span>
                <span className="font-bold text-slate-900">{formatRupiah(closingSuccessDialog.physicalCashActual)}</span>
              </div>
              <div className="flex justify-between pt-1 border-t border-slate-200 font-bold">
                <span>Selisih Kas:</span>
                <span className={closingSuccessDialog.difference === 0 ? 'text-emerald-600' : 'text-rose-600'}>
                  {closingSuccessDialog.difference >= 0 ? '+' : ''}
                  {formatRupiah(closingSuccessDialog.difference)} ({closingSuccessDialog.difference === 0 ? 'COCOK' : 'SELISIH'})
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-2 pt-2">
              <button
                onClick={() => {
                  exportCashClosingToPDF(closingSuccessDialog, storeSettings);
                  setClosingSuccessDialog(null);
                }}
                className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs"
              >
                <Printer className="w-4 h-4" />
                <span>Cetak Berita Acara (PDF)</span>
              </button>
              <button
                onClick={() => setClosingSuccessDialog(null)}
                className="w-full py-2 px-4 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold text-xs"
              >
                Tutup Jendela
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
