import React, { useState } from 'react';
import { Transaction, StoreSettings } from '../types';
import { formatRupiah, formatDate, generateReceiptWhatsAppText, openWhatsApp, cleanPhoneNumber } from '../utils/format';
import { Printer, MessageCircle, X, Check, Copy, Share2 } from 'lucide-react';

interface ReceiptModalProps {
  transaction: Transaction | null;
  storeSettings: StoreSettings;
  onClose: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  transaction,
  storeSettings,
  onClose,
}) => {
  const [copied, setCopied] = useState(false);
  const [recipientPhone, setRecipientPhone] = useState(transaction?.customerPhone || '');

  if (!transaction) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleSendWhatsApp = () => {
    const text = generateReceiptWhatsAppText(transaction, storeSettings);
    openWhatsApp(recipientPhone || transaction.customerPhone || '', text);
  };

  const handleCopyText = () => {
    const text = generateReceiptWhatsAppText(transaction, storeSettings);
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const is58mm = storeSettings.paperWidth === '58mm';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200 flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="bg-slate-900 text-white px-5 py-3.5 flex items-center justify-between no-print">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
              ✓
            </div>
            <div>
              <h3 className="font-semibold text-sm">Struk Transaksi</h3>
              <p className="text-xs text-slate-400 font-mono">{transaction.invoiceNumber}</p>
            </div>
          </div>
          <button
            id="close-receipt-btn"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Action Controls for WhatsApp */}
        <div className="p-4 bg-emerald-50 border-b border-emerald-100 no-print">
          <label className="block text-xs font-medium text-emerald-900 mb-1.5">
            Kirim Struk Otomatis ke WhatsApp Pelanggan:
          </label>
          <div className="flex gap-2">
            <input
              id="receipt-wa-input"
              type="tel"
              placeholder="Contoh: 08123456789"
              value={recipientPhone}
              onChange={e => setRecipientPhone(e.target.value)}
              className="flex-1 bg-white border border-emerald-300 rounded-lg px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
            />
            <button
              id="send-wa-receipt-btn"
              onClick={handleSendWhatsApp}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs transition"
            >
              <MessageCircle size={15} />
              Kirim WA
            </button>
          </div>
        </div>

        {/* Printable Thermal Receipt Container */}
        <div className="p-5 overflow-y-auto bg-slate-100/70 flex justify-center">
          <div
            id="printable-thermal-receipt"
            className={`bg-white shadow-sm border border-slate-200 p-4 text-slate-800 font-mono text-xs ${
              is58mm ? 'w-[280px]' : 'w-[340px]'
            }`}
          >
            {/* Header Store Info */}
            <div className="text-center pb-3 border-b border-dashed border-slate-400">
              <h2 className="font-bold text-sm text-slate-900 uppercase tracking-tight">
                {storeSettings.storeName}
              </h2>
              {storeSettings.tagline && (
                <p className="text-[10px] text-slate-500 italic mt-0.5">{storeSettings.tagline}</p>
              )}
              <p className="text-[10px] text-slate-600 mt-1">{storeSettings.address}</p>
              <p className="text-[10px] text-slate-600">Telp: {storeSettings.phone}</p>
            </div>

            {/* Meta Transaction Info */}
            <div className="py-2.5 border-b border-dashed border-slate-400 space-y-0.5 text-[11px]">
              <div className="flex justify-between">
                <span>No. Nota:</span>
                <span className="font-bold">{transaction.invoiceNumber}</span>
              </div>
              <div className="flex justify-between">
                <span>Tanggal:</span>
                <span>{formatDate(transaction.timestamp)}</span>
              </div>
              <div className="flex justify-between">
                <span>Kasir:</span>
                <span>{transaction.cashierName}</span>
              </div>
              <div className="flex justify-between">
                <span>Pelanggan:</span>
                <span className="font-medium">{transaction.customerName || 'Umum'}</span>
              </div>
              <div className="flex justify-between">
                <span>Status:</span>
                <span className={`font-bold ${transaction.status === 'LUNAS' ? 'text-emerald-700' : 'text-amber-700'}`}>
                  {transaction.status}
                </span>
              </div>
            </div>

            {/* Items List */}
            <div className="py-2.5 border-b border-dashed border-slate-400">
              <div className="flex justify-between font-bold text-[11px] mb-1.5 text-slate-900">
                <span>MENU / ITEM</span>
                <span>TOTAL</span>
              </div>
              <div className="space-y-2">
                {transaction.items.map((item, idx) => (
                  <div key={idx} className="text-[11px]">
                    <div className="font-medium text-slate-900">{item.productName}</div>
                    {item.selectedVariants.length > 0 && (
                      <div className="text-[10px] text-slate-500 pl-1">
                        + {item.selectedVariants.map(v => v.name).join(', ')}
                      </div>
                    )}
                    {item.notes && (
                      <div className="text-[10px] text-slate-400 italic pl-1">
                        Catatan: {item.notes}
                      </div>
                    )}
                    <div className="flex justify-between text-slate-600 pl-1">
                      <span>{item.quantity} x {formatRupiah(item.finalPricePerUnit)}</span>
                      <span className="font-semibold text-slate-800">{formatRupiah(item.subtotal)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Financial Summary */}
            <div className="py-2.5 border-b border-dashed border-slate-400 space-y-1 text-[11px]">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>{formatRupiah(transaction.subtotal)}</span>
              </div>
              {transaction.discount > 0 && (
                <div className="flex justify-between text-red-600">
                  <span>Diskon:</span>
                  <span>-{formatRupiah(transaction.discount)}</span>
                </div>
              )}
              {transaction.tax > 0 && (
                <div className="flex justify-between">
                  <span>Pajak ({storeSettings.taxRate}%):</span>
                  <span>+{formatRupiah(transaction.tax)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-xs pt-1 border-t border-slate-200 text-slate-900">
                <span>TOTAL AKHIR:</span>
                <span>{formatRupiah(transaction.finalAmount)}</span>
              </div>
              <div className="flex justify-between text-slate-700">
                <span>Metode Bayar:</span>
                <span className="font-bold">
                  {transaction.paymentMethod === 'SALDO_DEPOSIT' ? 'SALDO DEPOSIT' : transaction.paymentMethod}
                </span>
              </div>
              {transaction.paymentMethod === 'SALDO_DEPOSIT' && (
                <>
                  <div className="flex justify-between text-emerald-800">
                    <span>Saldo Digunakan:</span>
                    <span className="font-bold font-mono">
                      {formatRupiah(transaction.depositUsed || transaction.finalAmount)}
                    </span>
                  </div>
                  {transaction.remainingDeposit !== undefined && (
                    <div className="flex justify-between text-slate-700">
                      <span>Sisa Saldo Deposit:</span>
                      <span className="font-bold font-mono text-emerald-700">
                        {formatRupiah(transaction.remainingDeposit)}
                      </span>
                    </div>
                  )}
                </>
              )}
              {transaction.paymentMethod === 'TUNAI' && (
                <>
                  <div className="flex justify-between text-slate-600">
                    <span>Uang Diterima:</span>
                    <span>{formatRupiah(transaction.amountPaid)}</span>
                  </div>
                  <div className="flex justify-between font-medium text-slate-800">
                    <span>Kembalian:</span>
                    <span>{formatRupiah(transaction.change)}</span>
                  </div>
                </>
              )}
            </div>

            {/* Footer */}
            <div className="text-center pt-3 text-[10px] text-slate-600 space-y-1">
              <p className="font-medium">{storeSettings.receiptFooter || 'Terima kasih atas kunjungan Anda!'}</p>
              <p className="text-[9px] text-slate-400 font-semibold tracking-wide">
                {storeSettings.storeName} • {storeSettings.tagline || 'Jajanan Wareg Seger'}
              </p>
            </div>
          </div>
        </div>

        {/* Modal Bottom Buttons */}
        <div className="p-4 bg-white border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 no-print">
          <button
            id="copy-receipt-btn"
            onClick={handleCopyText}
            className="px-3 py-2 border border-slate-300 hover:bg-slate-100 rounded-lg text-xs text-slate-700 font-medium flex items-center gap-1.5 transition"
          >
            {copied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
            {copied ? 'Tersalin!' : 'Salin Teks'}
          </button>

          <div className="flex items-center gap-2">
            <button
              id="print-receipt-btn"
              onClick={handlePrint}
              className="bg-slate-800 hover:bg-slate-900 text-white px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs transition"
            >
              <Printer size={15} />
              Cetak Struk
            </button>
            <button
              id="done-receipt-btn"
              onClick={onClose}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-xs font-semibold shadow-xs transition"
            >
              Selesai
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
