import React, { useState } from 'react';
import {
  X,
  CheckCircle,
  Clock,
  DollarSign,
  User,
  CreditCard,
  Wallet,
  MessageCircle,
  FileText,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Receipt,
} from 'lucide-react';
import { Transaction, PaymentRecord } from '../types';
import { useWarung } from '../context/WarungContext';
import {
  formatRupiah,
  formatDateWithTime,
  generateDebtPaymentReceiptWhatsAppText,
  openWhatsApp,
} from '../utils/format';

interface SettleInvoiceDebtModalProps {
  transaction: Transaction;
  onClose: () => void;
  onSuccess?: () => void;
}

export const SettleInvoiceDebtModal: React.FC<SettleInvoiceDebtModalProps> = ({
  transaction,
  onClose,
  onSuccess,
}) => {
  const { settleTransactionDebt, customers, storeSettings, currentUser } = useWarung();

  // Net bill & debt calculation
  const netBill = Math.max(0, transaction.finalAmount - (transaction.totalReturnedAmount || 0));
  const alreadyPaid = (transaction.paymentHistory || []).reduce((s, p) => s + (p.amount || 0), 0);
  const currentRemaining = Math.max(0, netBill - alreadyPaid);

  const customer = customers.find(c => c.id === transaction.customerId);
  const depositAvailable = customer?.depositBalance || 0;

  // Form states
  const [payMode, setPayMode] = useState<'FULL' | 'PARTIAL'>('FULL');
  const [amountInput, setAmountInput] = useState<string>(currentRemaining.toString());
  const [paymentMethod, setPaymentMethod] = useState<'TUNAI' | 'TRANSFER' | 'SALDO_DEPOSIT'>('TUNAI');
  const [notes, setNotes] = useState<string>('');
  const [sendWaReceipt, setSendWaReceipt] = useState<boolean>(true);
  const [showHistory, setShowHistory] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Parse numeric amount
  const numericAmount = parseInt(amountInput.replace(/\D/g, '') || '0', 10);
  const effectivePayAmount = Math.min(numericAmount, currentRemaining);
  const remainingAfter = Math.max(0, currentRemaining - effectivePayAmount);
  const isWillBeFullyPaid = remainingAfter === 0 && effectivePayAmount > 0;

  // Mode change handler
  const handleModeChange = (mode: 'FULL' | 'PARTIAL') => {
    setPayMode(mode);
    setErrorMsg('');
    if (mode === 'FULL') {
      setAmountInput(currentRemaining.toString());
    } else {
      // Suggest 50% or 10000 if not full
      const half = Math.round(currentRemaining / 2);
      setAmountInput(half > 0 ? half.toString() : currentRemaining.toString());
    }
  };

  // Percentage shortcuts
  const applyPercentage = (pct: number) => {
    const calculated = Math.round((currentRemaining * pct) / 100);
    // Round to nearest 500 or 1000 for convenience
    const rounded = calculated >= 1000 ? Math.round(calculated / 500) * 500 : calculated;
    setAmountInput(rounded.toString());
    setErrorMsg('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (effectivePayAmount <= 0) {
      setErrorMsg('Nominal pembayaran harus lebih besar dari Rp 0.');
      return;
    }

    if (paymentMethod === 'SALDO_DEPOSIT' && depositAvailable < effectivePayAmount) {
      setErrorMsg(`Saldo deposit pelanggan (${formatRupiah(depositAvailable)}) tidak mencukupi untuk bayar ${formatRupiah(effectivePayAmount)}.`);
      return;
    }

    setIsSubmitting(true);

    const defaultNotes = notes.trim()
      ? notes.trim()
      : isWillBeFullyPaid
      ? `Pelunasan Penuh Nota ${transaction.invoiceNumber}`
      : `Cicilan Pembayaran Nota ${transaction.invoiceNumber}`;

    const res = settleTransactionDebt(
      transaction.id,
      effectivePayAmount,
      defaultNotes,
      paymentMethod
    );

    if (res.success) {
      // Optional: Kirim struk WA bukti pembayaran piutang
      if (sendWaReceipt && transaction.customerPhone) {
        const dummyRecord: PaymentRecord = {
          id: 'pay-' + Date.now(),
          date: new Date().toISOString(),
          amount: effectivePayAmount,
          paymentMethod,
          notes: defaultNotes,
          remainingAmountAfter: res.remaining,
          receivedBy: currentUser?.name || storeSettings.cashierName,
        };
        const waText = generateDebtPaymentReceiptWhatsAppText(
          transaction,
          dummyRecord,
          storeSettings,
          res.remaining
        );
        openWhatsApp(transaction.customerPhone, waText);
      }

      if (onSuccess) onSuccess();
      onClose();
    } else {
      setErrorMsg(res.message);
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 my-auto animate-in fade-in zoom-in-95 duration-150"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-600 via-amber-700 to-amber-800 text-white p-4 sm:p-5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center font-bold">
              <Receipt size={20} />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base leading-tight">
                Pembayaran Piutang Nota
              </h3>
              <p className="text-[11px] text-amber-100 font-mono mt-0.5">
                {transaction.invoiceNumber}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/90 hover:text-white transition"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* Customer & Bill Overview Card */}
          <div className="bg-gradient-to-br from-amber-50/70 to-orange-50/40 p-3.5 rounded-2xl border border-amber-200/80 space-y-2.5">
            <div className="flex flex-wrap items-center justify-between text-xs gap-1">
              <div className="flex items-center gap-1.5 text-slate-700 font-semibold">
                <User size={13} className="text-amber-700" />
                <span>Pelanggan:</span>
                <span className="font-bold text-slate-900">{transaction.customerName || 'Pelanggan Umum'}</span>
                {transaction.customerPhone && (
                  <span className="text-[10px] text-slate-500 font-mono">({transaction.customerPhone})</span>
                )}
              </div>
              <div className="text-[11px] text-slate-500">
                {formatDateWithTime(transaction.timestamp)}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-amber-200/60 text-center">
              <div className="bg-white/80 p-2 rounded-xl border border-amber-100">
                <span className="block text-[10px] text-slate-500 font-medium">Total Nota</span>
                <span className="font-mono font-bold text-xs text-slate-800">{formatRupiah(netBill)}</span>
              </div>
              <div className="bg-white/80 p-2 rounded-xl border border-emerald-100">
                <span className="block text-[10px] text-emerald-700 font-medium">Sudah Dibayar</span>
                <span className="font-mono font-bold text-xs text-emerald-700">{formatRupiah(alreadyPaid)}</span>
              </div>
              <div className="bg-amber-500 text-white p-2 rounded-xl shadow-xs">
                <span className="block text-[10px] text-amber-100 font-semibold">Sisa Tagihan</span>
                <span className="font-mono font-bold text-xs sm:text-sm">{formatRupiah(currentRemaining)}</span>
              </div>
            </div>

            {/* Collapsible Payment History */}
            {transaction.paymentHistory && transaction.paymentHistory.length > 0 && (
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => setShowHistory(!showHistory)}
                  className="w-full flex items-center justify-between py-1 px-2 text-[11px] text-amber-800 hover:text-amber-950 font-semibold bg-amber-100/60 hover:bg-amber-100 rounded-lg transition"
                >
                  <span className="flex items-center gap-1">
                    <Clock size={12} />
                    Riwayat Pembayaran Sebelumnya ({transaction.paymentHistory.length}x)
                  </span>
                  {showHistory ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                </button>

                {showHistory && (
                  <div className="mt-2 space-y-1.5 bg-white p-2.5 rounded-xl border border-amber-200 max-h-36 overflow-y-auto text-[11px]">
                    {transaction.paymentHistory.map((rec, idx) => (
                      <div
                        key={rec.id || idx}
                        className="flex items-center justify-between py-1 border-b border-slate-100 last:border-b-0"
                      >
                        <div>
                          <div className="font-semibold text-slate-800">
                            {formatRupiah(rec.amount)}
                            <span className="text-[10px] font-normal text-slate-500 ml-1.5">
                              via {rec.paymentMethod || 'TUNAI'}
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {formatDateWithTime(rec.date)} {rec.notes ? `• ${rec.notes}` : ''}
                          </div>
                        </div>
                        {rec.remainingAmountAfter !== undefined && (
                          <div className="text-right">
                            <span className="text-[9px] text-slate-400 block">Sisa setelahnya</span>
                            <span className="font-mono text-[10px] font-bold text-slate-700">
                              {formatRupiah(rec.remainingAmountAfter)}
                            </span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Mode Tabs: Lunas Seluruhnya vs Sebagian (Cicil) */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Pilihan Pembayaran:
            </label>
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl">
              <button
                type="button"
                onClick={() => handleModeChange('FULL')}
                className={`py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                  payMode === 'FULL'
                    ? 'bg-white text-emerald-700 shadow-xs border border-emerald-200'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <CheckCircle size={14} className={payMode === 'FULL' ? 'text-emerald-600' : 'text-slate-400'} />
                <span>Bayar Lunas Semua</span>
              </button>
              <button
                type="button"
                onClick={() => handleModeChange('PARTIAL')}
                className={`py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                  payMode === 'PARTIAL'
                    ? 'bg-white text-amber-700 shadow-xs border border-amber-200'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Clock size={14} className={payMode === 'PARTIAL' ? 'text-amber-600' : 'text-slate-400'} />
                <span>Bayar Sebagian (Cicil)</span>
              </button>
            </div>
          </div>

          {/* Nominal Input & Quick Chips */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800">
                Nominal Pembayaran (Rp) *
              </label>
              {payMode === 'PARTIAL' && (
                <span className="text-[10px] text-slate-500">Maks. {formatRupiah(currentRemaining)}</span>
              )}
            </div>

            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-sm">
                Rp
              </span>
              <input
                type="text"
                inputMode="numeric"
                required
                value={amountInput ? Number(amountInput.replace(/\D/g, '')).toLocaleString('id-ID') : ''}
                onChange={e => {
                  const raw = e.target.value.replace(/\D/g, '');
                  if (!raw) {
                    setAmountInput('');
                    return;
                  }
                  const num = parseInt(raw, 10);
                  if (num > currentRemaining) {
                    setAmountInput(currentRemaining.toString());
                  } else {
                    setAmountInput(num.toString());
                  }
                  setErrorMsg('');
                }}
                placeholder="Contoh: 50.000"
                className="w-full pl-11 pr-3 py-2.5 bg-white border border-slate-300 rounded-xl font-mono text-base font-bold text-slate-900 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 shadow-xs"
              />
            </div>

            {/* Quick Percentage Chips if partial */}
            {payMode === 'PARTIAL' && currentRemaining > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {[25, 50, 75].map(pct => (
                  <button
                    key={pct}
                    type="button"
                    onClick={() => applyPercentage(pct)}
                    className="px-2.5 py-1 text-[11px] font-semibold bg-slate-100 hover:bg-amber-100 text-slate-700 hover:text-amber-900 rounded-lg transition"
                  >
                    {pct}% ({formatRupiah(Math.round((currentRemaining * pct) / 100))})
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setAmountInput(currentRemaining.toString())}
                  className="px-2.5 py-1 text-[11px] font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg transition ml-auto"
                >
                  Penuh (100%)
                </button>
              </div>
            )}

            {/* Interactive Sisa Tagihan Live Preview */}
            <div
              className={`p-2.5 rounded-xl border flex items-center justify-between text-xs transition ${
                isWillBeFullyPaid
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : 'bg-amber-50/80 border-amber-200 text-amber-900'
              }`}
            >
              <div className="flex items-center gap-1.5">
                {isWillBeFullyPaid ? (
                  <CheckCircle size={15} className="text-emerald-600 shrink-0" />
                ) : (
                  <Clock size={15} className="text-amber-600 shrink-0" />
                )}
                <span className="font-semibold">
                  {isWillBeFullyPaid ? 'Status setelah dibayar:' : 'Sisa tagihan setelah ini:'}
                </span>
              </div>
              <div className="font-mono font-bold text-right">
                {isWillBeFullyPaid ? (
                  <span className="px-2 py-0.5 bg-emerald-600 text-white rounded-md text-[11px]">
                    LUNAS (Rp 0)
                  </span>
                ) : (
                  <span className="text-amber-900 font-bold">{formatRupiah(remainingAfter)}</span>
                )}
              </div>
            </div>
          </div>

          {/* Metode Pembayaran */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Metode Pembayaran:
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setPaymentMethod('TUNAI')}
                className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 transition ${
                  paymentMethod === 'TUNAI'
                    ? 'bg-emerald-50 border-emerald-500 text-emerald-800 shadow-xs'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <DollarSign size={16} className={paymentMethod === 'TUNAI' ? 'text-emerald-600' : 'text-slate-400'} />
                <span>Tunai (Cash)</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('TRANSFER')}
                className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 transition ${
                  paymentMethod === 'TRANSFER'
                    ? 'bg-blue-50 border-blue-500 text-blue-800 shadow-xs'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <CreditCard size={16} className={paymentMethod === 'TRANSFER' ? 'text-blue-600' : 'text-slate-400'} />
                <span>Transfer Bank</span>
              </button>

              <button
                type="button"
                disabled={depositAvailable <= 0}
                onClick={() => setPaymentMethod('SALDO_DEPOSIT')}
                className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 transition ${
                  depositAvailable <= 0
                    ? 'bg-slate-50 border-slate-200 text-slate-300 cursor-not-allowed opacity-60'
                    : paymentMethod === 'SALDO_DEPOSIT'
                    ? 'bg-purple-50 border-purple-500 text-purple-800 shadow-xs'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
                title={depositAvailable <= 0 ? 'Pelanggan tidak memiliki saldo deposit' : `Saldo: ${formatRupiah(depositAvailable)}`}
              >
                <Wallet size={16} className={paymentMethod === 'SALDO_DEPOSIT' ? 'text-purple-600' : 'text-slate-400'} />
                <span>Saldo Deposit</span>
                <span className="text-[9px] font-normal">
                  {depositAvailable > 0 ? formatRupiah(depositAvailable) : 'Kosong'}
                </span>
              </button>
            </div>
          </div>

          {/* Catatan Pelunasan */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Catatan Pembayaran (Opsional)
            </label>
            <input
              type="text"
              placeholder="Contoh: Diterima tunai di warung / titip tetangga"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-amber-500"
            />
          </div>

          {/* WhatsApp Receipt Toggle */}
          {transaction.customerPhone && (
            <label className="flex items-center gap-2 p-2.5 bg-emerald-50/70 border border-emerald-200 rounded-xl cursor-pointer">
              <input
                type="checkbox"
                checked={sendWaReceipt}
                onChange={e => setSendWaReceipt(e.target.checked)}
                className="w-4 h-4 text-emerald-600 rounded-sm focus:ring-emerald-500 border-slate-300"
              />
              <div className="flex items-center gap-1.5 text-xs text-emerald-900 font-semibold">
                <MessageCircle size={14} className="text-emerald-600" />
                <span>Kirim bukti tanda terima pembayaran ke WhatsApp pelanggan</span>
              </div>
            </label>
          )}

          {/* Error Message */}
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-center gap-2">
              <AlertCircle size={15} className="shrink-0 text-rose-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Modal Actions */}
          <div className="pt-2 flex gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 px-4 border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold rounded-xl text-xs transition"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting || effectivePayAmount <= 0}
              className="flex-1 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold rounded-xl text-xs shadow-md transition flex items-center justify-center gap-1.5"
            >
              <CheckCircle size={15} />
              <span>
                {isWillBeFullyPaid
                  ? `Lunasi Nota (${formatRupiah(effectivePayAmount)})`
                  : `Bayar Cicilan (${formatRupiah(effectivePayAmount)})`}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
