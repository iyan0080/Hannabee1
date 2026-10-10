import React, { useState, useMemo } from 'react';
import { useWarung } from '../context/WarungContext';
import { Transaction, PaymentMethod, TransactionStatus } from '../types';
import {
  formatRupiah,
  formatDate,
  openWhatsApp,
  generateReceiptWhatsAppText,
  getTransactionRemainingDebt,
  calculateCustomerTotalDebt,
} from '../utils/format';
import { ReceiptModal } from './ReceiptModal';
import { CancelReturnModal } from './CancelReturnModal';
import { RetroactiveSaleModal } from './RetroactiveSaleModal';
import { EditTransactionModal } from './EditTransactionModal';
import { SettleInvoiceDebtModal } from './SettleInvoiceDebtModal';
import { exportTransactionsToExcel, exportTransactionsToPDF } from '../utils/exportData';
import {
  Search,
  Filter,
  FileSpreadsheet,
  FileText,
  Printer,
  MessageCircle,
  CheckCircle2,
  AlertCircle,
  Calendar,
  X,
  CreditCard,
  RotateCcw,
  Ban,
  Undo2,
  Info,
  Plus,
  Edit3,
  History,
  Copy,
  Check,
} from 'lucide-react';

export const TransactionsView: React.FC = () => {
  const {
    transactions,
    customers,
    storeSettings,
    settleCustomerDebt,
    syncCustomerDebt,
    syncAllCustomerDebts,
  } = useWarung();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | TransactionStatus>('ALL');
  const [methodFilter, setMethodFilter] = useState<'ALL' | PaymentMethod>('ALL');
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  // Check if any customer has a discrepancy between profile totalDebt and actual transactions remaining
  const hasAnyDebtDiscrepancy = useMemo(() => {
    return customers.some(
      c => (c.totalDebt || 0) !== calculateCustomerTotalDebt(c.id, transactions)
    );
  }, [customers, transactions]);

  const handleSyncAllDebts = () => {
    const res = syncAllCustomerDebts();
    if (res.fixedCount > 0) {
      setSyncFeedback(`Berhasil menyinkronkan data kasbon! ${res.fixedCount} data pelanggan disesuaikan agar cocok 100% dengan sisa riwayat transaksi.`);
    } else {
      setSyncFeedback('Semua sisa kasbon pelanggan sudah cocok 100% dengan riwayat nota.');
    }
    setTimeout(() => setSyncFeedback(null), 4000);
  };

  // Modals
  const [showRetroactiveModal, setShowRetroactiveModal] = useState<boolean>(false);
  const [editingTrx, setEditingTrx] = useState<Transaction | null>(null);
  const [selectedReceipt, setSelectedReceipt] = useState<Transaction | null>(null);
  const [cancelReturnTrx, setCancelReturnTrx] = useState<Transaction | null>(null);
  const [settlingTrx, setSettlingTrx] = useState<Transaction | null>(null);

  // Filtered transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      const matchSearch =
        t.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (t.customerName && t.customerName.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (t.customerPhone && t.customerPhone.includes(searchQuery)) ||
        (t.cancellationReason && t.cancellationReason.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (t.returnRecords && t.returnRecords.some(r => r.reason.toLowerCase().includes(searchQuery.toLowerCase()))) ||
        t.items.some(i => i.productName.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchStatus = statusFilter === 'ALL' || t.status === statusFilter;
      const matchMethod = methodFilter === 'ALL' || t.paymentMethod === methodFilter;

      return matchSearch && matchStatus && matchMethod;
    });
  }, [transactions, searchQuery, statusFilter, methodFilter]);

  const activeTransactions = filteredTransactions.filter(t => t.status !== 'BATAL');
  const totalFilteredAmount = activeTransactions.reduce((s, t) => {
    const net = Math.max(0, t.finalAmount - (t.totalReturnedAmount || 0));
    return s + net;
  }, 0);
  const totalFilteredProfit = activeTransactions.reduce((s, t) => {
    const retAmt = t.totalReturnedAmount || 0;
    const retCost = t.totalReturnedCost || 0;
    const netProfit = Math.max(0, t.grossProfit - retAmt + retCost);
    return s + netProfit;
  }, 0);

  const [copiedWa, setCopiedWa] = useState(false);
  const handleCopyTransactionsSummary = () => {
    let text = `*RINGKASAN TRANSAKSI PENJUALAN - ${storeSettings.storeName.toUpperCase()}*\n`;
    text += `Waktu: ${new Date().toLocaleDateString('id-ID')}\n`;
    text += `Total Transaksi: ${filteredTransactions.length}\n`;
    text += `Total Omzet Bersih: ${formatRupiah(totalFilteredAmount)}\n`;
    text += `Laba Kotor Bersih: ${formatRupiah(totalFilteredProfit)}\n\n`;
    text += `_Ringkasan riwayat transaksi POS ${storeSettings.storeName}_`;

    navigator.clipboard.writeText(text).then(() => {
      setCopiedWa(true);
      setTimeout(() => setCopiedWa(false), 2500);
    });
  };

  const handleDirectWhatsApp = (trx: Transaction) => {
    const text = generateReceiptWhatsAppText(trx, storeSettings);
    openWhatsApp(trx.customerPhone || '', text);
  };

  return (
    <div className="max-w-7xl mx-auto p-3 sm:p-5 space-y-5">
      
      {/* Header & Export Actions */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-teal-100 text-teal-800 flex items-center justify-center font-bold">
              🧾
            </span>
            <h2 className="text-base sm:text-lg font-bold text-slate-900">
              Riwayat Transaksi Penjualan
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Total {filteredTransactions.length} transaksi ({formatRupiah(totalFilteredAmount)} total omzet setelah dikurangi retur)
          </p>
        </div>

        {/* Export Buttons - 1 Kolom (Atas dan Bawah) */}
        <div className="flex flex-col gap-1.5 w-full sm:w-52 shrink-0">
          <button
            id="sync-all-debt-btn"
            onClick={handleSyncAllDebts}
            className="w-full px-3 py-1.5 bg-amber-50 text-amber-900 border border-amber-300 hover:bg-amber-100 rounded-xl text-xs font-semibold flex items-center justify-center sm:justify-start gap-2 shadow-2xs transition"
            title="Sinkronkan saldo kasbon seluruh pelanggan dengan riwayat transaksi nyata"
          >
            <RotateCcw size={14} className="text-amber-700 shrink-0" />
            <span>Sinkronkan Kasbon</span>
          </button>

          <button
            id="export-trx-excel-btn"
            onClick={() => exportTransactionsToExcel(filteredTransactions, storeSettings)}
            className="w-full px-3 py-1.5 bg-emerald-50 text-emerald-800 border border-emerald-300 hover:bg-emerald-100 rounded-xl text-xs font-semibold flex items-center justify-center sm:justify-start gap-2 shadow-2xs transition"
          >
            <FileSpreadsheet size={14} className="text-emerald-700 shrink-0" />
            <span>Ekspor Excel (.xlsx)</span>
          </button>

          <button
            id="export-trx-pdf-btn"
            onClick={() => exportTransactionsToPDF(filteredTransactions, storeSettings, 'Daftar Transaksi')}
            className="w-full px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold flex items-center justify-center sm:justify-start gap-2 shadow-2xs transition"
          >
            <FileText size={14} className="text-slate-300 shrink-0" />
            <span>Cetak PDF Transaksi</span>
          </button>

          <button
            id="export-trx-copy-wa-btn"
            onClick={handleCopyTransactionsSummary}
            className="w-full px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center sm:justify-start gap-2 shadow-2xs transition"
            title="Salin ringkasan transaksi ke WhatsApp"
          >
            {copiedWa ? <Check size={14} className="shrink-0" /> : <Copy size={14} className="shrink-0" />}
            <span>{copiedWa ? 'Tersalin!' : 'Salin ke WA'}</span>
          </button>
        </div>
      </div>

      {/* Discrepancy Banner Alert */}
      {hasAnyDebtDiscrepancy && (
        <div className="bg-amber-50 border border-amber-300 p-3.5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-start gap-2.5">
            <AlertCircle size={18} className="text-amber-700 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-amber-950">
                Perhatian: Sisa Total Kasbon Pelanggan Tidak Sesuai Riwayat Transaksi
              </p>
              <p className="text-[11px] text-amber-800 mt-0.5 leading-relaxed">
                Ditemukan selisih antara saldo kasbon di profil pelanggan dengan sisa riwayat nota transaksi (contoh: nota kasbon WRG-20261005-4535). Klik tombol di samping untuk menyamakan dan memperbaiki seluruh data kasbon secara instan.
              </p>
            </div>
          </div>
          <button
            onClick={handleSyncAllDebts}
            className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shrink-0 shadow-xs transition flex items-center gap-1.5 cursor-pointer"
          >
            <RotateCcw size={13} />
            <span>Perbaiki & Sinkronkan Kasbon</span>
          </button>
        </div>
      )}

      {/* Sync Feedback Toast Banner */}
      {syncFeedback && (
        <div className="bg-emerald-50 border border-emerald-300 text-emerald-900 px-3.5 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 shadow-2xs animate-in fade-in">
          <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
          <span>{syncFeedback}</span>
        </div>
      )}

      {/* Filter & Search Bar */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              id="trx-search-input"
              type="text"
              placeholder="Cari nota, pelanggan, alasan batal/retur, menu..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Status Filter */}
          <select
            id="trx-status-filter"
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as any)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
          >
            <option value="ALL">Semua Status Transaksi</option>
            <option value="LUNAS">✅ Lunas Saja</option>
            <option value="BELUM_LUNAS">⏳ Belum Lunas (Kasbon)</option>
            <option value="DIRETUR_SEBAGIAN">🔄 Diretur Sebagian</option>
            <option value="BATAL">❌ Dibatalkan</option>
          </select>

          {/* Payment Method Filter */}
          <select
            id="trx-method-filter"
            value={methodFilter}
            onChange={e => setMethodFilter(e.target.value as any)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
          >
            <option value="ALL">Semua Metode Pembayaran</option>
            <option value="TUNAI">💵 Tunai</option>
            <option value="QRIS">📱 QRIS</option>
            <option value="TRANSFER">🏦 Transfer Bank</option>
            <option value="SALDO_DEPOSIT">💰 Saldo Deposit</option>
            <option value="KASBON">📝 Kasbon (Hutang)</option>
          </select>
        </div>
      </div>

      {/* Transactions Table / List */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-900 text-white uppercase text-[10px] tracking-wider font-semibold">
              <tr>
                <th className="px-4 py-3">No. Nota & Waktu</th>
                <th className="px-4 py-3">Pelanggan</th>
                <th className="px-4 py-3">Item Menu / Varian</th>
                <th className="px-4 py-3 text-right">Nilai Transaksi (Setelah Retur)</th>
                <th className="px-4 py-3 text-right">Laba Kotor</th>
                <th className="px-4 py-3 text-center">Metode & Status</th>
                <th className="px-4 py-3 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredTransactions.map(trx => {
                const isKasbon = trx.paymentMethod === 'KASBON' || trx.status === 'BELUM_LUNAS';
                const isCancelled = trx.status === 'BATAL';
                const isPartialReturn = trx.status === 'DIRETUR_SEBAGIAN';
                const returnedAmount = trx.totalReturnedAmount || 0;
                const hasReturn = returnedAmount > 0 || isPartialReturn;
                const netTransactionAmount = Math.max(0, trx.finalAmount - returnedAmount);
                const remainingDebt = getTransactionRemainingDebt(trx);

                return (
                  <tr
                    key={trx.id}
                    className={`transition ${
                      isCancelled ? 'bg-red-50/40 hover:bg-red-50/70' : isPartialReturn ? 'bg-indigo-50/30 hover:bg-indigo-50/50' : 'hover:bg-slate-50'
                    }`}
                  >
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`font-bold font-mono ${isCancelled ? 'text-red-700 line-through' : 'text-slate-900'}`}>
                          {trx.invoiceNumber}
                        </span>
                        {trx.isRetroactive && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-teal-100 text-teal-800 border border-teal-200">
                            Susulan Kemarin
                          </span>
                        )}
                        {trx.editedAt && (
                          <span
                            className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-100 text-amber-800 border border-amber-200 cursor-help"
                            title={`Diedit oleh ${trx.editedBy || 'Admin'}${trx.editReason ? `: ${trx.editReason}` : ''}`}
                          >
                            Diedit
                          </span>
                        )}
                        {isCancelled && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-red-100 text-red-700">
                            BATAL
                          </span>
                        )}
                        {isPartialReturn && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-indigo-100 text-indigo-800">
                            RETUR
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500">{formatDate(trx.timestamp)}</div>
                      {trx.cancellationReason && (
                        <div className="text-[10px] text-red-600 italic truncate max-w-[180px] mt-0.5" title={trx.cancellationReason}>
                          Alasan: "{trx.cancellationReason}"
                        </div>
                      )}
                      {trx.editReason && !isCancelled && (
                        <div className="text-[10px] text-amber-700 italic truncate max-w-[180px] mt-0.5" title={trx.editReason}>
                          Koreksi: "{trx.editReason}"
                        </div>
                      )}
                    </td>

                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="font-semibold text-slate-800">{trx.customerName || 'Umum'}</div>
                      {trx.customerPhone && (
                        <div className="text-[10px] text-slate-400 font-mono">{trx.customerPhone}</div>
                      )}
                      {(() => {
                        if (!trx.customerId) return null;
                        const customer = customers.find(c => c.id === trx.customerId);
                        if (!customer) return null;
                        const calculatedDebt = calculateCustomerTotalDebt(customer.id, transactions);
                        const hasDiscrepancy = (customer.totalDebt || 0) !== calculatedDebt;

                        if (hasDiscrepancy) {
                          return (
                            <div className="mt-1 flex items-center gap-1 bg-amber-50 border border-amber-300 px-1.5 py-0.5 rounded text-[9px] text-amber-900">
                              <AlertCircle size={10} className="text-amber-600 shrink-0" />
                              <span title={`Profil: ${formatRupiah(customer.totalDebt)}, Riwayat: ${formatRupiah(calculatedDebt)}`}>
                                Kasbon: {formatRupiah(customer.totalDebt)} ≠ {formatRupiah(calculatedDebt)}
                              </span>
                              <button
                                type="button"
                                onClick={e => {
                                  e.stopPropagation();
                                  syncCustomerDebt(customer.id);
                                }}
                                className="ml-1 px-1.5 py-0.5 bg-amber-600 hover:bg-amber-700 text-white rounded text-[8px] font-bold flex items-center gap-0.5 cursor-pointer shadow-2xs"
                                title="Klik untuk sinkronkan kasbon pelanggan ini"
                              >
                                <RotateCcw size={8} />
                                <span>Sinkron</span>
                              </button>
                            </div>
                          );
                        }
                        return null;
                      })()}
                    </td>

                    <td className="px-4 py-3 max-w-xs">
                      <div className="space-y-0.5 text-[11px] text-slate-700">
                        {trx.items.map((item, idx) => (
                          <div key={idx} className="truncate">
                            <span className="font-medium text-slate-900">{item.quantity}x</span> {item.productName}
                            {item.selectedVariants.length > 0 && (
                              <span className="text-[10px] text-slate-500"> ({item.selectedVariants.map(v => v.name).join(', ')})</span>
                            )}
                            {item.discountAmount && item.discountAmount > 0 && (
                              <span className="ml-1 text-[10px] text-emerald-700 font-semibold bg-emerald-50 px-1 py-0.2 rounded border border-emerald-200">
                                Diskon -{formatRupiah(item.discountAmount)}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </td>

                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      {isCancelled ? (
                        <div>
                          <div className="font-bold font-mono text-red-600 line-through text-sm">
                            {formatRupiah(trx.finalAmount)}
                          </div>
                          <span className="text-[10px] text-red-600 font-semibold bg-red-50 px-1.5 py-0.5 rounded border border-red-200 inline-block mt-0.5">
                            Rp 0 (Batal)
                          </span>
                        </div>
                      ) : hasReturn && returnedAmount > 0 ? (
                        <div>
                          {/* Nominal transaksi setelah dikurangi retur */}
                          <div className="font-bold font-mono text-slate-900 text-sm">
                            {formatRupiah(netTransactionAmount)}
                          </div>
                          <div className="text-[10px] text-indigo-800 font-bold bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200 inline-block mt-0.5">
                            Dikurangi Retur: -{formatRupiah(returnedAmount)}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                            <span className="line-through">Awal: {formatRupiah(trx.finalAmount)}</span>
                          </div>
                        </div>
                      ) : (
                        <div className="font-bold font-mono text-slate-900 text-sm">
                          {formatRupiah(trx.finalAmount)}
                        </div>
                      )}
                      {trx.discount > 0 && (
                        <div className="text-[10px] text-red-500 font-medium mt-0.5">Diskon: -{formatRupiah(trx.discount)}</div>
                      )}
                      {isKasbon && (() => {
                        const alreadyPaid = Math.max(
                          (trx.paymentHistory || []).reduce((s, p) => s + (p.amount || 0), 0),
                          trx.amountPaid || 0
                        );
                        const remaining = remainingDebt;
                        if (alreadyPaid > 0 || remaining > 0) {
                          return (
                            <div className="text-[10px] font-semibold text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 mt-1">
                              {alreadyPaid > 0 && <div>Dicicil: {formatRupiah(alreadyPaid)}</div>}
                              <div className={`font-bold ${remaining > 0 ? 'text-rose-700' : 'text-emerald-700'}`}>
                                {remaining > 0 ? `Sisa: ${formatRupiah(remaining)}` : '✓ Lunas'}
                              </div>
                            </div>
                          );
                        }
                        return null;
                      })()}
                    </td>

                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      {isCancelled ? (
                        <span className="text-slate-400 text-xs italic">-</span>
                      ) : (
                        <>
                          <div className="font-semibold text-teal-700 font-mono">
                            {formatRupiah(
                              isPartialReturn && trx.totalReturnedAmount
                                ? Math.max(0, trx.grossProfit - (trx.totalReturnedAmount - (trx.totalReturnedCost || 0)))
                                : trx.grossProfit
                            )}
                          </div>
                          <div className="text-[10px] text-slate-400">Modal: {formatRupiah(trx.totalCost)}</div>
                        </>
                      )}
                    </td>

                    <td className="px-4 py-3 text-center whitespace-nowrap">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-bold mb-1 ${
                          trx.paymentMethod === 'SALDO_DEPOSIT'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : trx.paymentMethod === 'KASBON'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {trx.paymentMethod === 'SALDO_DEPOSIT' ? '💰 DEPOSIT' : trx.paymentMethod}
                      </span>
                      <div>
                        {isCancelled ? (
                          <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700 border border-red-200">
                            ❌ Dibatalkan
                          </span>
                        ) : isPartialReturn ? (
                          <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-200">
                            🔄 Retur Sebagian
                          </span>
                        ) : isKasbon ? (
                          (() => {
                            const alreadyPaid = Math.max(
                              (trx.paymentHistory || []).reduce((s, p) => s + (p.amount || 0), 0),
                              trx.amountPaid || 0
                            );
                            const remaining = remainingDebt;
                            const isPartial = alreadyPaid > 0 && remaining > 0;
                            const isFullyPaid = remaining === 0;

                            if (isFullyPaid) {
                              return (
                                <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                  ✓ Lunas
                                </span>
                              );
                            }

                            return (
                              <span
                                className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                  isPartial
                                    ? 'bg-orange-100 text-orange-900 border-orange-300'
                                    : 'bg-amber-100 text-amber-800 border-amber-300'
                                }`}
                                title={isPartial ? `Sudah dicicil: ${formatRupiah(alreadyPaid)}, Sisa: ${formatRupiah(remaining)}` : `Belum dibayar: ${formatRupiah(remaining)}`}
                              >
                                {isPartial ? `⏳ Cicil (Sisa ${formatRupiah(remaining)})` : `⏳ Kasbon (${formatRupiah(remaining)})`}
                              </span>
                            );
                          })()
                        ) : (
                          <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                            ✓ Lunas
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="px-4 py-3 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1.5">
                        {/* Struk button */}
                        <button
                          id={`view-receipt-${trx.id}`}
                          onClick={() => setSelectedReceipt(trx)}
                          className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition"
                          title="Lihat & Cetak Struk"
                        >
                          <Printer size={14} />
                        </button>

                        {/* WhatsApp button */}
                        <button
                          id={`wa-receipt-${trx.id}`}
                          onClick={() => handleDirectWhatsApp(trx)}
                          className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg transition"
                          title="Kirim Struk via WhatsApp"
                        >
                          <MessageCircle size={14} />
                        </button>

                        {/* Edit Button (Admin / Owner) */}
                        <button
                          id={`edit-trx-btn-${trx.id}`}
                          onClick={() => setEditingTrx(trx)}
                          className="p-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-lg transition"
                          title="Edit / Koreksi Data Penjualan Kemarin"
                        >
                          <Edit3 size={14} />
                        </button>

                        {/* Pelunasan Kasbon button if unpaid */}
                        {isKasbon && remainingDebt > 0 && (
                          <button
                            id={`settle-trx-${trx.id}`}
                            onClick={() => setSettlingTrx(trx)}
                            className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-[11px] font-bold shadow-xs transition flex items-center gap-1"
                            title="Bayar / Lunasi Tagihan Nota Ini (Sebagian atau Seluruhnya)"
                          >
                            <span>Bayar</span>
                          </button>
                        )}

                        {/* Batal / Retur Button */}
                        <button
                          id={`cancel-return-btn-${trx.id}`}
                          onClick={() => setCancelReturnTrx(trx)}
                          className={`p-1.5 rounded-lg text-[11px] font-semibold flex items-center gap-1 transition ${
                            isCancelled
                              ? 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                              : 'bg-red-50 hover:bg-red-100 text-red-700 border border-red-200'
                          }`}
                          title={isCancelled ? 'Lihat Detail Pembatalan' : 'Batal / Retur Pesanan'}
                        >
                          <RotateCcw size={13} />
                          <span className="hidden sm:inline">{isCancelled ? 'Detail' : 'Batal/Retur'}</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredTransactions.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-slate-400">
                    Tidak ada riwayat transaksi yang sesuai filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Settle Debt Modal (Per Nota: Sebagian atau Seluruhnya) */}
      {settlingTrx && (
        <SettleInvoiceDebtModal
          transaction={settlingTrx}
          onClose={() => setSettlingTrx(null)}
        />
      )}

      {/* Cancel & Return Modal */}
      {cancelReturnTrx && (
        <CancelReturnModal
          transaction={cancelReturnTrx}
          onClose={() => setCancelReturnTrx(null)}
        />
      )}

      {/* Receipt Modal */}
      {selectedReceipt && (
        <ReceiptModal
          transaction={selectedReceipt}
          storeSettings={storeSettings}
          onClose={() => setSelectedReceipt(null)}
        />
      )}

      {/* Input Penjualan Susulan (Kemarin / Lampau) Modal */}
      {showRetroactiveModal && (
        <RetroactiveSaleModal
          onClose={() => setShowRetroactiveModal(false)}
          onSuccess={(trx) => {
            setSelectedReceipt(trx);
          }}
        />
      )}

      {/* Edit Transaksi (Kemarin / Koreksi) Modal */}
      {editingTrx && (
        <EditTransactionModal
          transaction={editingTrx}
          onClose={() => setEditingTrx(null)}
        />
      )}

    </div>
  );
};

