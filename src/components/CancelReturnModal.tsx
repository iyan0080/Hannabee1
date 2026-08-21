import React, { useState, useMemo } from 'react';
import { Transaction, Customer } from '../types';
import { useWarung } from '../context/WarungContext';
import { formatRupiah, formatDate } from '../utils/format';
import {
  X,
  AlertTriangle,
  RotateCcw,
  Ban,
  Package,
  Check,
  History,
  Coins,
  ArrowRight,
  Info,
  Layers,
} from 'lucide-react';

interface CancelReturnModalProps {
  transaction: Transaction;
  onClose: () => void;
  onSuccess?: () => void;
}

export const CancelReturnModal: React.FC<CancelReturnModalProps> = ({
  transaction,
  onClose,
  onSuccess,
}) => {
  const { cancelTransaction, returnTransactionItems, customers } = useWarung();

  const [activeTab, setActiveTab] = useState<'CANCEL' | 'RETURN' | 'HISTORY'>('CANCEL');

  // Customer reference
  const matchedCustomer = useMemo(() => {
    if (!transaction.customerId) return null;
    return customers.find(c => c.id === transaction.customerId) || null;
  }, [transaction.customerId, customers]);

  const isReseller = transaction.customerType === 'RESELLER' || matchedCustomer?.customerType === 'RESELLER';

  // --- STATE FOR FULL CANCELLATION ---
  const [cancelReason, setCancelReason] = useState('');
  const [cancelRestock, setCancelRestock] = useState(true);
  const [cancelError, setCancelError] = useState<string | null>(null);

  // --- STATE FOR PARTIAL RETURN ---
  // Store returned quantities mapping: { [cartItemId]: quantity }
  const [returnQuantities, setReturnQuantities] = useState<{ [cartItemId: string]: number }>({});
  const [returnReason, setReturnReason] = useState('');
  const [returnRestock, setReturnRestock] = useState(true);
  const [returnRefundMethod, setReturnRefundMethod] = useState<'TUNAI' | 'SALDO_DEPOSIT' | 'POTONG_KASBON' | 'TRANSFER'>(() => {
    if (transaction.paymentMethod === 'SALDO_DEPOSIT' && !isReseller) return 'SALDO_DEPOSIT';
    if (transaction.status === 'BELUM_LUNAS') return 'POTONG_KASBON';
    return 'TUNAI';
  });
  const [returnError, setReturnError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Calculate available quantities for each item in the transaction
  const itemAvailability = useMemo(() => {
    return transaction.items.map(item => {
      const alreadyReturned = (transaction.returnRecords || []).reduce((sum, rec) => {
        const matched = rec.items.find(ri => ri.cartItemId === item.id);
        return sum + (matched ? matched.returnedQuantity : 0);
      }, 0);
      const remaining = Math.max(0, item.quantity - alreadyReturned);
      return {
        ...item,
        alreadyReturned,
        remaining,
      };
    });
  }, [transaction]);

  // Calculate partial return totals
  const returnSummary = useMemo(() => {
    let totalItems = 0;
    let grossRefund = 0;
    const selectedItems: { cartItemId: string; returnedQuantity: number }[] = [];

    itemAvailability.forEach(item => {
      const qty = returnQuantities[item.id] || 0;
      if (qty > 0) {
        totalItems += qty;
        grossRefund += qty * item.finalPricePerUnit;
        selectedItems.push({
          cartItemId: item.id,
          returnedQuantity: qty,
        });
      }
    });

    // Pro-rate discount
    let effectiveRefund = grossRefund;
    if (transaction.subtotal > 0 && transaction.discount > 0) {
      const discountRatio = transaction.discount / transaction.subtotal;
      effectiveRefund = Math.max(0, Math.round(grossRefund * (1 - discountRatio)));
    }

    // Pro-rate tax
    if (transaction.subtotal > 0 && transaction.tax > 0) {
      const taxRate = transaction.tax / (transaction.subtotal - transaction.discount);
      effectiveRefund = Math.round(effectiveRefund * (1 + taxRate));
    }

    return {
      totalItems,
      grossRefund,
      effectiveRefund,
      selectedItems,
    };
  }, [itemAvailability, returnQuantities, transaction]);

  // Quick reasons chips
  const quickCancelReasons = [
    'Pelanggan membatalkan pesanan',
    'Salah input kasir / salah menu',
    'Pesanan rusak / tumpah / basi',
    'Pembatalan sepihak / salah nota',
    'Duplikat transaksi',
  ];

  const quickReturnReasons = [
    'Porsi berlebih / salah jumlah',
    'Rasa / pesanan tidak sesuai permintaan',
    'Produk cacat / rusak saat disajikan',
    'Pelanggan ingin tukar item lain',
    'Makanan tidak habis / cancel porsi',
  ];

  // Handle quantity adjustment
  const handleQuantityChange = (cartItemId: string, maxQty: number, val: number) => {
    const clamped = Math.max(0, Math.min(maxQty, val));
    setReturnQuantities(prev => ({
      ...prev,
      [cartItemId]: clamped,
    }));
  };

  // Submit Full Cancellation
  const handleFullCancelSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cancelReason.trim()) {
      setCancelError('Keterangan alasan pembatalan wajib diisi.');
      return;
    }
    setCancelError(null);
    setIsSubmitting(true);

    try {
      const res = cancelTransaction(transaction.id, cancelReason, cancelRestock);
      if (!res.success) {
        setCancelError(res.message || 'Gagal membatalkan transaksi.');
        setIsSubmitting(false);
        return;
      }
      setIsSubmitting(false);
      onSuccess?.();
      onClose();
    } catch (err: any) {
      setCancelError(err.message || 'Terjadi kesalahan sistem.');
      setIsSubmitting(false);
    }
  };

  // Submit Partial Return
  const handlePartialReturnSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!returnReason.trim()) {
      setReturnError('Keterangan alasan retur wajib diisi.');
      return;
    }
    if (returnSummary.totalItems <= 0) {
      setReturnError('Silakan pilih minimal 1 item untuk diretur.');
      return;
    }
    setReturnError(null);
    setIsSubmitting(true);

    try {
      const res = returnTransactionItems(transaction.id, {
        reason: returnReason,
        items: returnSummary.selectedItems,
        refundMethod: returnRefundMethod,
        restockProducts: returnRestock,
      });

      if (!res.success) {
        setReturnError(res.message || 'Gagal memproses retur.');
        setIsSubmitting(false);
        return;
      }
      setIsSubmitting(false);
      onSuccess?.();
      onClose();
    } catch (err: any) {
      setReturnError(err.message || 'Terjadi kesalahan sistem.');
      setIsSubmitting(false);
    }
  };

  const hasHistory = (transaction.returnRecords && transaction.returnRecords.length > 0) || transaction.status === 'BATAL';
  const isFullyCancelled = transaction.status === 'BATAL';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden border border-slate-200 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-red-500/20 text-red-400 flex items-center justify-center font-bold">
              <RotateCcw size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm sm:text-base">Pembatalan & Retur Pesanan</h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-300 font-semibold">
                  {transaction.invoiceNumber}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Pelanggan: <strong className="text-white">{transaction.customerName || 'Umum'}</strong> • Total: <strong className="text-emerald-400 font-mono">{formatRupiah(transaction.finalAmount)}</strong>
              </p>
            </div>
          </div>
          <button
            id="close-cancel-modal-btn"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="bg-slate-100 p-1.5 border-b border-slate-200 flex gap-1 text-xs font-semibold">
          {!isFullyCancelled && (
            <>
              <button
                type="button"
                id="tab-cancel-full-btn"
                onClick={() => setActiveTab('CANCEL')}
                className={`flex-1 py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 transition ${
                  activeTab === 'CANCEL'
                    ? 'bg-white text-red-700 shadow-xs border border-red-200 font-bold'
                    : 'text-slate-600 hover:bg-white/60'
                }`}
              >
                <Ban size={14} className={activeTab === 'CANCEL' ? 'text-red-600' : 'text-slate-400'} />
                <span>Batal Seluruh Pesanan</span>
              </button>

              <button
                type="button"
                id="tab-return-partial-btn"
                onClick={() => setActiveTab('RETURN')}
                className={`flex-1 py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 transition ${
                  activeTab === 'RETURN'
                    ? 'bg-white text-indigo-700 shadow-xs border border-indigo-200 font-bold'
                    : 'text-slate-600 hover:bg-white/60'
                }`}
              >
                <RotateCcw size={14} className={activeTab === 'RETURN' ? 'text-indigo-600' : 'text-slate-400'} />
                <span>Retur Sebagian Item</span>
              </button>
            </>
          )}

          {hasHistory && (
            <button
              type="button"
              id="tab-history-btn"
              onClick={() => setActiveTab('HISTORY')}
              className={`flex-1 py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 transition ${
                activeTab === 'HISTORY' || isFullyCancelled
                  ? 'bg-white text-slate-900 shadow-xs border border-slate-300 font-bold'
                  : 'text-slate-600 hover:bg-white/60'
              }`}
            >
              <History size={14} className="text-slate-600" />
              <span>Riwayat Batal & Retur ({transaction.returnRecords?.length || 1})</span>
            </button>
          )}
        </div>

        {/* Content Area */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
          {/* TAB 1: FULL CANCELLATION */}
          {activeTab === 'CANCEL' && !isFullyCancelled && (
            <form onSubmit={handleFullCancelSubmit} className="space-y-4">
              <div className="bg-red-50 border border-red-200 rounded-xl p-3.5 flex items-start gap-3">
                <AlertTriangle className="text-red-600 shrink-0 mt-0.5" size={18} />
                <div className="text-xs text-red-900 leading-relaxed">
                  <p className="font-bold">Perhatian Pembatalan Total:</p>
                  <p className="mt-0.5">
                    Pesanan dengan nomor nota <strong>{transaction.invoiceNumber}</strong> akan dibatalkan secara permanen.
                    Semua item yang belum diretur akan dikembalikan stoknya (jika opsi aktif) dan dana/kasbon pelanggan akan disesuaikan.
                  </p>
                </div>
              </div>

              {cancelError && (
                <div className="bg-red-100 border border-red-300 text-red-800 px-3.5 py-2 rounded-xl text-xs font-medium">
                  {cancelError}
                </div>
              )}

              {/* Transaction Summary Card */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2 text-xs">
                <div className="flex justify-between font-medium text-slate-700">
                  <span>Total Nilai Pesanan:</span>
                  <span className="font-bold font-mono text-slate-900">{formatRupiah(transaction.finalAmount)}</span>
                </div>
                {transaction.totalReturnedAmount && transaction.totalReturnedAmount > 0 ? (
                  <div className="flex justify-between text-indigo-700">
                    <span>Sudah Diretur Sebelumnya:</span>
                    <span className="font-mono">-{formatRupiah(transaction.totalReturnedAmount)}</span>
                  </div>
                ) : null}
                <div className="flex justify-between font-bold text-red-700 pt-1.5 border-t border-slate-200">
                  <span>Dana yang Dibatalkan / Dikembalikan:</span>
                  <span className="font-mono text-sm">
                    {formatRupiah(Math.max(0, transaction.finalAmount - (transaction.totalReturnedAmount || 0)))}
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 pt-1">
                  Metode Asal: <strong>{transaction.paymentMethod}</strong>
                  {transaction.paymentMethod === 'SALDO_DEPOSIT' && (
                    <span className="ml-1 text-emerald-700 font-semibold">(Akan otomatis masuk ke saldo deposit pelanggan)</span>
                  )}
                  {transaction.status === 'BELUM_LUNAS' && (
                    <span className="ml-1 text-amber-700 font-semibold">(Akan otomatis menghapus/memotong sisa tagihan kasbon)</span>
                  )}
                </div>
              </div>

              {/* Alasan Pembatalan (Required) */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-800">
                  Keterangan Alasan Pembatalan <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="cancel-reason-textarea"
                  rows={2}
                  value={cancelReason}
                  onChange={e => setCancelReason(e.target.value)}
                  placeholder="Ketik keterangan rinci mengapa pesanan ini dibatalkan..."
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-500 placeholder:text-slate-400"
                  required
                />
                {/* Quick Chips */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {quickCancelReasons.map((chip, idx) => (
                    <button
                      type="button"
                      key={idx}
                      onClick={() => setCancelReason(chip)}
                      className="px-2.5 py-1 bg-slate-100 hover:bg-red-50 hover:text-red-700 hover:border-red-200 border border-slate-200 rounded-lg text-[11px] text-slate-600 transition"
                    >
                      {chip}
                    </button>
                  ))}
                </div>
              </div>

              {/* Restock Checkbox */}
              <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Package size={16} className="text-slate-600" />
                  <div>
                    <span className="text-xs font-semibold text-slate-800 block">
                      Kembalikan Stok Produk ke Etalase
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Stok produk akan otomatis ditambahkan kembali sesuai jumlah yang belum diretur.
                    </span>
                  </div>
                </div>
                <input
                  id="cancel-restock-checkbox"
                  type="checkbox"
                  checked={cancelRestock}
                  onChange={e => setCancelRestock(e.target.checked)}
                  className="w-4 h-4 text-red-600 rounded border-slate-300 focus:ring-red-500"
                />
              </div>

              {/* Modal Buttons */}
              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-xl text-xs font-semibold transition"
                >
                  Tutup
                </button>
                <button
                  id="confirm-full-cancel-btn"
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow-xs transition flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Ban size={14} />
                  <span>{isSubmitting ? 'Memproses...' : 'Konfirmasi Batalkan Pesanan'}</span>
                </button>
              </div>
            </form>
          )}

          {/* TAB 2: PARTIAL RETURN */}
          {activeTab === 'RETURN' && !isFullyCancelled && (
            <form onSubmit={handlePartialReturnSubmit} className="space-y-4">
              <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3.5 flex items-start gap-3">
                <Info className="text-indigo-600 shrink-0 mt-0.5" size={18} />
                <div className="text-xs text-indigo-900 leading-relaxed">
                  <p className="font-bold">Retur Sebagian Item Pesanan:</p>
                  <p className="mt-0.5">
                    Pilih item dan tentukan berapa jumlah (kuantitas) yang ingin dikembalikan oleh pelanggan.
                    Nilai pengembalian dana dan stok akan dikalkulasikan secara proporsional.
                  </p>
                </div>
              </div>

              {returnError && (
                <div className="bg-red-100 border border-red-300 text-red-800 px-3.5 py-2 rounded-xl text-xs font-medium">
                  {returnError}
                </div>
              )}

              {/* Item Selection Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                <div className="bg-slate-100 px-3 py-2 border-b border-slate-200 text-[11px] font-bold text-slate-700 uppercase tracking-wider flex justify-between">
                  <span>Daftar Menu / Item Pesanan</span>
                  <span>Jumlah Retur</span>
                </div>
                <div className="divide-y divide-slate-100 bg-white">
                  {itemAvailability.map(item => {
                    const currentVal = returnQuantities[item.id] || 0;
                    const isAvailable = item.remaining > 0;

                    return (
                      <div
                        key={item.id}
                        className={`p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                          !isAvailable ? 'bg-slate-50 opacity-60' : currentVal > 0 ? 'bg-indigo-50/50' : ''
                        }`}
                      >
                        <div className="space-y-0.5 flex-1">
                          <div className="font-bold text-xs text-slate-900">{item.productName}</div>
                          {item.selectedVariants.length > 0 && (
                            <div className="text-[10px] text-slate-500">
                              + {item.selectedVariants.map(v => v.name).join(', ')}
                            </div>
                          )}
                          <div className="text-[11px] text-slate-500">
                            Harga: <strong className="text-slate-800">{formatRupiah(item.finalPricePerUnit)}</strong> • Pesan Awal: <strong>{item.quantity}x</strong>
                            {item.alreadyReturned > 0 && (
                              <span className="text-red-600 ml-1 font-medium">(Sudah Diretur: {item.alreadyReturned}x)</span>
                            )}
                          </div>
                        </div>

                        {/* Quantity Counter */}
                        <div className="flex items-center gap-2 shrink-0">
                          {isAvailable ? (
                            <>
                              <div className="flex items-center border border-slate-300 rounded-lg overflow-hidden bg-white">
                                <button
                                  type="button"
                                  onClick={() => handleQuantityChange(item.id, item.remaining, currentVal - 1)}
                                  className="px-2.5 py-1 text-slate-600 hover:bg-slate-100 font-bold transition text-xs"
                                >
                                  -
                                </button>
                                <input
                                  type="number"
                                  min={0}
                                  max={item.remaining}
                                  value={currentVal}
                                  onChange={e => handleQuantityChange(item.id, item.remaining, parseInt(e.target.value) || 0)}
                                  className="w-12 text-center text-xs font-bold text-slate-800 focus:outline-none py-1"
                                />
                                <button
                                  type="button"
                                  onClick={() => handleQuantityChange(item.id, item.remaining, currentVal + 1)}
                                  className="px-2.5 py-1 text-slate-600 hover:bg-slate-100 font-bold transition text-xs"
                                >
                                  +
                                </button>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleQuantityChange(item.id, item.remaining, item.remaining)}
                                className="px-2 py-1 bg-slate-100 hover:bg-indigo-100 hover:text-indigo-800 rounded-md text-[10px] font-semibold text-slate-600 transition"
                              >
                                Max ({item.remaining})
                              </button>
                            </>
                          ) : (
                            <span className="px-2.5 py-1 bg-slate-200 text-slate-500 rounded-lg text-[10px] font-bold">
                              Semua Telah Diretur
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Return Calculation Summary */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2 text-xs">
                <div className="flex justify-between text-slate-700">
                  <span>Total Item yang Diretur:</span>
                  <span className="font-bold text-indigo-900">{returnSummary.totalItems} item</span>
                </div>
                <div className="flex justify-between text-slate-700">
                  <span>Nilai Kotor Item:</span>
                  <span className="font-mono">{formatRupiah(returnSummary.grossRefund)}</span>
                </div>
                {transaction.discount > 0 && (
                  <div className="flex justify-between text-red-600 text-[11px]">
                    <span>Penyesuaian Diskon Nota:</span>
                    <span>Pro-rata diterapkan</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-indigo-900 text-sm pt-2 border-t border-slate-200">
                  <span>Total Dana Refund ke Pelanggan:</span>
                  <span className="font-mono text-base text-indigo-700">{formatRupiah(returnSummary.effectiveRefund)}</span>
                </div>
              </div>

              {/* Alasan Retur (Required) */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-800">
                  Keterangan Alasan Retur <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="return-reason-textarea"
                  rows={2}
                  value={returnReason}
                  onChange={e => setReturnReason(e.target.value)}
                  placeholder="Ketik keterangan rinci item yang diretur beserta alasannya..."
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-slate-400"
                  required
                />
                {/* Quick Chips */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {quickReturnReasons.map((chip, idx) => (
                    <button
                      type="button"
                      key={idx}
                      onClick={() => setReturnReason(chip)}
                      className="px-2.5 py-1 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200 border border-slate-200 rounded-lg text-[11px] text-slate-600 transition"
                    >
                      {chip}
                    </button>
                  ))}
                </div>
              </div>

              {/* Refund Method Selector */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-800">
                  Metode Pengembalian Dana (Refund):
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <label
                    className={`p-2.5 rounded-xl border flex flex-col items-center justify-center gap-1 cursor-pointer transition text-center ${
                      returnRefundMethod === 'TUNAI'
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-900 font-bold'
                        : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="refundMethod"
                      value="TUNAI"
                      checked={returnRefundMethod === 'TUNAI'}
                      onChange={() => setReturnRefundMethod('TUNAI')}
                      className="sr-only"
                    />
                    <span>💵 Tunai (Kas)</span>
                  </label>

                  {/* Saldo deposit only if customer is registered and not reseller */}
                  {matchedCustomer && !isReseller ? (
                    <label
                      className={`p-2.5 rounded-xl border flex flex-col items-center justify-center gap-1 cursor-pointer transition text-center ${
                        returnRefundMethod === 'SALDO_DEPOSIT'
                          ? 'border-emerald-600 bg-emerald-50 text-emerald-900 font-bold'
                          : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <input
                        type="radio"
                        name="refundMethod"
                        value="SALDO_DEPOSIT"
                        checked={returnRefundMethod === 'SALDO_DEPOSIT'}
                        onChange={() => setReturnRefundMethod('SALDO_DEPOSIT')}
                        className="sr-only"
                      />
                      <span>💰 Saldo Deposit</span>
                    </label>
                  ) : null}

                  {transaction.status === 'BELUM_LUNAS' && (
                    <label
                      className={`p-2.5 rounded-xl border flex flex-col items-center justify-center gap-1 cursor-pointer transition text-center ${
                        returnRefundMethod === 'POTONG_KASBON'
                          ? 'border-amber-600 bg-amber-50 text-amber-900 font-bold'
                          : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <input
                        type="radio"
                        name="refundMethod"
                        value="POTONG_KASBON"
                        checked={returnRefundMethod === 'POTONG_KASBON'}
                        onChange={() => setReturnRefundMethod('POTONG_KASBON')}
                        className="sr-only"
                      />
                      <span>📝 Potong Kasbon</span>
                    </label>
                  )}

                  <label
                    className={`p-2.5 rounded-xl border flex flex-col items-center justify-center gap-1 cursor-pointer transition text-center ${
                      returnRefundMethod === 'TRANSFER'
                        ? 'border-blue-600 bg-blue-50 text-blue-900 font-bold'
                        : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="refundMethod"
                      value="TRANSFER"
                      checked={returnRefundMethod === 'TRANSFER'}
                      onChange={() => setReturnRefundMethod('TRANSFER')}
                      className="sr-only"
                    />
                    <span>🏦 Transfer Bank</span>
                  </label>
                </div>
              </div>

              {/* Restock Checkbox */}
              <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Package size={16} className="text-slate-600" />
                  <div>
                    <span className="text-xs font-semibold text-slate-800 block">
                      Kembalikan Stok Item ke Inventory
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Stok produk akan otomatis ditambah sejumlah kuantitas item yang diretur.
                    </span>
                  </div>
                </div>
                <input
                  id="return-restock-checkbox"
                  type="checkbox"
                  checked={returnRestock}
                  onChange={e => setReturnRestock(e.target.checked)}
                  className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                />
              </div>

              {/* Modal Buttons */}
              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-xl text-xs font-semibold transition"
                >
                  Tutup
                </button>
                <button
                  id="confirm-partial-return-btn"
                  type="submit"
                  disabled={isSubmitting || returnSummary.totalItems === 0}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition flex items-center gap-1.5 disabled:opacity-50"
                >
                  <RotateCcw size={14} />
                  <span>{isSubmitting ? 'Memproses...' : `Konfirmasi Retur (${returnSummary.totalItems} Item)`}</span>
                </button>
              </div>
            </form>
          )}

          {/* TAB 3: HISTORY */}
          {(activeTab === 'HISTORY' || isFullyCancelled) && (
            <div className="space-y-4">
              {isFullyCancelled && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-1 bg-red-600 text-white text-[11px] font-bold rounded-lg uppercase">
                      ❌ DIBATALKAN TOTAL
                    </span>
                    {transaction.cancelledAt && (
                      <span className="text-xs text-slate-500">{formatDate(transaction.cancelledAt)}</span>
                    )}
                  </div>
                  <div className="text-xs text-slate-800">
                    <strong>Alasan Pembatalan:</strong>
                    <p className="italic text-slate-700 mt-0.5 bg-white p-2.5 rounded-lg border border-red-100 font-medium">
                      "{transaction.cancellationReason || 'Tidak ada keterangan'}"
                    </p>
                  </div>
                  {transaction.cancelledBy && (
                    <p className="text-[11px] text-slate-500">Petugas / Kasir: {transaction.cancelledBy}</p>
                  )}
                </div>
              )}

              {/* List of Return Records */}
              {transaction.returnRecords && transaction.returnRecords.length > 0 ? (
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Log Rincian Retur ({transaction.returnRecords.length} Catatan):
                  </h4>
                  {transaction.returnRecords.map((rec, idx) => (
                    <div key={idx} className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          rec.type === 'FULL_CANCEL' ? 'bg-red-100 text-red-800' : 'bg-indigo-100 text-indigo-800'
                        }`}>
                          {rec.type === 'FULL_CANCEL' ? 'BATAL TOTAL' : 'RETUR SEBAGIAN'}
                        </span>
                        <span className="text-[11px] text-slate-500">{formatDate(rec.timestamp)}</span>
                      </div>

                      <div className="bg-white p-2 rounded-lg border border-slate-200">
                        <span className="text-[10px] text-slate-400 block uppercase font-bold">Keterangan Alasan:</span>
                        <p className="font-semibold text-slate-900 mt-0.5">"{rec.reason}"</p>
                      </div>

                      {/* Items */}
                      <div className="space-y-1 pt-1">
                        <span className="text-[10px] text-slate-500 font-semibold uppercase">Item yang Diretur:</span>
                        {rec.items.map((it, iIdx) => (
                          <div key={iIdx} className="flex justify-between text-slate-700 text-[11px] pl-2 border-l-2 border-indigo-300">
                            <span>{it.returnedQuantity}x {it.productName} {it.variantNames ? `(${it.variantNames})` : ''}</span>
                            <span className="font-mono font-medium">{formatRupiah(it.refundSubtotal)}</span>
                          </div>
                        ))}
                      </div>

                      <div className="flex justify-between items-center pt-2 border-t border-slate-200 text-slate-800">
                        <span className="text-[11px]">
                          Refund: <strong>{rec.refundMethod}</strong> {rec.restockProducts ? '• Stok Restock (+)' : ''}
                        </span>
                        <span className="font-bold font-mono text-indigo-700">
                          {formatRupiah(rec.totalRefundAmount)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : !isFullyCancelled ? (
                <div className="text-center py-6 text-slate-400 text-xs">
                  Belum ada riwayat retur untuk pesanan ini.
                </div>
              ) : null}

              <div className="pt-3 flex justify-end border-t border-slate-200">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold transition"
                >
                  Tutup
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
