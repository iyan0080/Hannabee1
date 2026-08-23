import React, { useState, useMemo } from 'react';
import { useWarung } from '../context/WarungContext';
import { Transaction, PaymentMethod, TransactionStatus } from '../types';
import { formatRupiah, formatDate, openWhatsApp, generateReceiptWhatsAppText } from '../utils/format';
import { ReceiptModal } from './ReceiptModal';
import { CancelReturnModal } from './CancelReturnModal';
import { RetroactiveSaleModal } from './RetroactiveSaleModal';
import { EditTransactionModal } from './EditTransactionModal';
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
} from 'lucide-react';

export const TransactionsView: React.FC = () => {
  const { transactions, storeSettings, settleCustomerDebt } = useWarung();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | TransactionStatus>('ALL');
  const [methodFilter, setMethodFilter] = useState<'ALL' | PaymentMethod>('ALL');

  // Modals
  const [showRetroactiveModal, setShowRetroactiveModal] = useState<boolean>(false);
  const [editingTrx, setEditingTrx] = useState<Transaction | null>(null);
  const [selectedReceipt, setSelectedReceipt] = useState<Transaction | null>(null);
  const [cancelReturnTrx, setCancelReturnTrx] = useState<Transaction | null>(null);
  const [settlingTrx, setSettlingTrx] = useState<Transaction | null>(null);
  const [settleNotes, setSettleNotes] = useState('');

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
    const net = t.status === 'DIRETUR_SEBAGIAN' ? Math.max(0, t.finalAmount - (t.totalReturnedAmount || 0)) : t.finalAmount;
    return s + net;
  }, 0);
  const totalFilteredProfit = activeTransactions.reduce((s, t) => {
    const netProfit = t.status === 'DIRETUR_SEBAGIAN' ? Math.max(0, t.grossProfit - (t.totalReturnedAmount || 0) + (t.totalReturnedCost || 0)) : t.grossProfit;
    return s + netProfit;
  }, 0);

  const handleSettleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!settlingTrx) return;
    if (settlingTrx.customerId) {
      settleCustomerDebt(settlingTrx.customerId, settlingTrx.finalAmount, settleNotes || 'Pelunasan Kasbon Nota ' + settlingTrx.invoiceNumber);
    }
    setSettlingTrx(null);
    setSettleNotes('');
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
            Total {filteredTransactions.length} transaksi ({formatRupiah(totalFilteredAmount)} omzet aktif)
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            id="open-retroactive-sale-btn"
            onClick={() => setShowRetroactiveModal(true)}
            className="px-3.5 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition"
          >
            <History size={15} className="text-teal-200" />
            <span>+ Input Penjualan Susulan (Kemarin)</span>
          </button>

          <button
            id="export-trx-excel-btn"
            onClick={() => exportTransactionsToExcel(filteredTransactions, storeSettings)}
            className="px-3.5 py-2 bg-emerald-50 text-emerald-800 border border-emerald-300 hover:bg-emerald-100 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs transition"
          >
            <FileSpreadsheet size={15} className="text-emerald-700" />
            <span>Ekspor Excel (.xlsx)</span>
          </button>

          <button
            id="export-trx-pdf-btn"
            onClick={() => exportTransactionsToPDF(filteredTransactions, storeSettings, 'Daftar Transaksi')}
            className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs transition"
          >
            <FileText size={15} className="text-slate-300" />
            <span>Cetak PDF Transaksi</span>
          </button>
        </div>
      </div>

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
                <th className="px-4 py-3 text-right">Nilai Transaksi</th>
                <th className="px-4 py-3 text-right">Laba Kotor</th>
                <th className="px-4 py-3 text-center">Metode & Status</th>
                <th className="px-4 py-3 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredTransactions.map(trx => {
                const isKasbon = trx.status === 'BELUM_LUNAS';
                const isCancelled = trx.status === 'BATAL';
                const isPartialReturn = trx.status === 'DIRETUR_SEBAGIAN';

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
                      <div className={`font-bold font-mono ${isCancelled ? 'text-red-600 line-through' : 'text-slate-900'}`}>
                        {formatRupiah(trx.finalAmount)}
                      </div>
                      {isPartialReturn && trx.totalReturnedAmount && trx.totalReturnedAmount > 0 && (
                        <div className="text-[10px] text-indigo-700 font-medium">
                          Diretur: -{formatRupiah(trx.totalReturnedAmount)}
                        </div>
                      )}
                      {trx.discount > 0 && (
                        <div className="text-[10px] text-red-500">Diskon: -{formatRupiah(trx.discount)}</div>
                      )}
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
                          <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                            ⏳ Kasbon
                          </span>
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
                        {isKasbon && (
                          <button
                            id={`settle-trx-${trx.id}`}
                            onClick={() => setSettlingTrx(trx)}
                            className="px-2 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-[11px] font-semibold transition"
                            title="Lunasi Kasbon Ini"
                          >
                            Lunasi
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

      {/* Settle Debt Modal */}
      {settlingTrx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full overflow-hidden border border-slate-200">
            <div className="p-4 bg-slate-900 text-white flex justify-between items-center">
              <h3 className="font-bold text-sm">Pelunasan Kasbon Nota</h3>
              <button onClick={() => setSettlingTrx(null)} className="text-slate-400 hover:text-white">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSettleSubmit} className="p-4 space-y-3 text-xs">
              <div className="bg-amber-50 p-3 rounded-xl border border-amber-200">
                <div className="flex justify-between text-slate-700">
                  <span>No. Nota:</span>
                  <span className="font-bold font-mono">{settlingTrx.invoiceNumber}</span>
                </div>
                <div className="flex justify-between text-slate-700 mt-1">
                  <span>Pelanggan:</span>
                  <span className="font-semibold">{settlingTrx.customerName}</span>
                </div>
                <div className="flex justify-between text-amber-900 font-bold mt-2 pt-2 border-t border-amber-200">
                  <span>Total Tagihan:</span>
                  <span className="font-mono text-sm">{formatRupiah(settlingTrx.finalAmount)}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Catatan Pelunasan:
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Diterima tunai di warung"
                  value={settleNotes}
                  onChange={e => setSettleNotes(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-xl text-xs"
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setSettlingTrx(null)}
                  className="flex-1 px-3 py-2 border border-slate-200 text-slate-600 rounded-xl font-medium"
                >
                  Batal
                </button>
                <button
                  id="confirm-settle-btn"
                  type="submit"
                  className="flex-1 px-3 py-2 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700"
                >
                  Konfirmasi Lunas
                </button>
              </div>
            </form>
          </div>
        </div>
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

