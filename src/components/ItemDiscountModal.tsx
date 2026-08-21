import React, { useState, useEffect } from 'react';
import { Tag, Percent, DollarSign, X, Check, Trash2, Gift, Sparkles } from 'lucide-react';
import { CartItem, DiscountType } from '../types';
import { formatRupiah } from '../utils/format';

interface ItemDiscountModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: CartItem | null;
  onApplyDiscount: (cartItemId: string, type?: DiscountType, value?: number) => void;
}

export const ItemDiscountModal: React.FC<ItemDiscountModalProps> = ({
  isOpen,
  onClose,
  item,
  onApplyDiscount,
}) => {
  const [discountType, setDiscountType] = useState<DiscountType>('PERCENTAGE');
  const [discountValue, setDiscountValue] = useState<number>(0);

  useEffect(() => {
    if (item) {
      setDiscountType(item.discountType || 'PERCENTAGE');
      setDiscountValue(item.discountValue || 0);
    }
  }, [item]);

  if (!isOpen || !item) return null;

  const grossTotal = item.finalPricePerUnit * item.quantity;
  
  // Calculate discount amount preview
  let previewDiscountAmount = 0;
  if (discountType === 'PERCENTAGE') {
    const validPct = Math.min(100, Math.max(0, discountValue));
    previewDiscountAmount = Math.round((grossTotal * validPct) / 100);
  } else {
    previewDiscountAmount = Math.min(grossTotal, Math.max(0, discountValue));
  }
  const previewFinalPrice = Math.max(0, grossTotal - previewDiscountAmount);

  const handleApply = () => {
    if (discountValue <= 0) {
      onApplyDiscount(item.id, undefined, undefined);
    } else {
      onApplyDiscount(item.id, discountType, discountValue);
    }
    onClose();
  };

  const handleRemove = () => {
    onApplyDiscount(item.id, undefined, undefined);
    onClose();
  };

  const percentagePresets = [5, 10, 15, 20, 25, 50, 100];
  const nominalPresets = [1000, 2000, 3000, 5000, 10000, 20000, 50000];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col animate-scaleUp">
        
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
              <Tag size={18} />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Beri Diskon Item</h3>
              <p className="text-[11px] text-slate-500 line-clamp-1">{item.productName}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-slate-200 text-slate-500 flex items-center justify-center transition"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          
          {/* Item details card */}
          <div className="bg-blue-50/60 border border-blue-100 rounded-xl p-3 flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-[10px] text-blue-700 font-semibold uppercase tracking-wider">Detail Item</span>
              <div className="font-bold text-xs text-blue-950">{item.productName}</div>
              <div className="text-[11px] text-slate-600">
                {item.quantity} x {formatRupiah(item.finalPricePerUnit)}
              </div>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-slate-500 block">Total Normal</span>
              <span className="font-bold text-sm text-slate-900 font-mono">
                {formatRupiah(grossTotal)}
              </span>
            </div>
          </div>

          {/* Discount Type Selector Tabs */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Tipe Diskon:
            </label>
            <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-xl border border-slate-200">
              <button
                type="button"
                id="discount-type-pct-btn"
                onClick={() => {
                  setDiscountType('PERCENTAGE');
                  if (discountType !== 'PERCENTAGE' && discountValue > 100) {
                    setDiscountValue(10);
                  }
                }}
                className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition ${
                  discountType === 'PERCENTAGE'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Percent size={14} />
                <span>Persentase (%)</span>
              </button>
              <button
                type="button"
                id="discount-type-nominal-btn"
                onClick={() => {
                  setDiscountType('NOMINAL');
                  if (discountType !== 'NOMINAL' && discountValue <= 100) {
                    setDiscountValue(2000);
                  }
                }}
                className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition ${
                  discountType === 'NOMINAL'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <DollarSign size={14} />
                <span>Nominal Tetap (Rp)</span>
              </button>
            </div>
          </div>

          {/* Input field */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-slate-700">
                {discountType === 'PERCENTAGE' ? 'Persen Diskon (0 - 100%)' : 'Nominal Potongan (Rp)'}:
              </label>
              {discountValue > 0 && (
                <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  Hemat {formatRupiah(previewDiscountAmount)}
                </span>
              )}
            </div>

            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-sm text-slate-500 font-mono">
                {discountType === 'PERCENTAGE' ? '%' : 'Rp'}
              </div>
              <input
                id="item-discount-input"
                type="number"
                min="0"
                max={discountType === 'PERCENTAGE' ? 100 : grossTotal}
                step={discountType === 'PERCENTAGE' ? 1 : 500}
                value={discountValue || ''}
                placeholder="0"
                autoFocus
                onChange={e => {
                  const val = Number(e.target.value) || 0;
                  setDiscountValue(val);
                }}
                className="w-full pl-10 pr-3 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-bold font-mono text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-2xs"
              />
            </div>
          </div>

          {/* Preset Buttons */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-medium text-slate-500 flex items-center gap-1">
                <Sparkles size={12} className="text-amber-500" />
                Pilihan Cepat:
              </span>
              {discountValue > 0 && (
                <button
                  type="button"
                  onClick={() => setDiscountValue(0)}
                  className="text-[11px] font-medium text-red-600 hover:underline"
                >
                  Nol-kan
                </button>
              )}
            </div>
            
            <div className="flex flex-wrap gap-1.5">
              {discountType === 'PERCENTAGE' ? (
                percentagePresets.map(pct => (
                  <button
                    key={pct}
                    type="button"
                    onClick={() => setDiscountValue(pct)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition ${
                      discountValue === pct
                        ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                        : 'bg-slate-50 hover:bg-blue-50 text-slate-700 border-slate-200'
                    }`}
                  >
                    {pct === 100 ? (
                      <span className="flex items-center gap-1 text-emerald-700 font-extrabold">
                        <Gift size={12} /> 100% (Gratis)
                      </span>
                    ) : (
                      `${pct}%`
                    )}
                  </button>
                ))
              ) : (
                nominalPresets.map(nom => (
                  <button
                    key={nom}
                    type="button"
                    onClick={() => setDiscountValue(nom)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition ${
                      discountValue === nom
                        ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                        : 'bg-slate-50 hover:bg-blue-50 text-slate-700 border-slate-200'
                    }`}
                  >
                    {nom >= 1000 ? `${nom / 1000}rb` : nom}
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Real-time Calculation Summary */}
          <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 space-y-1.5 text-xs">
            <div className="flex justify-between text-slate-600">
              <span>Harga Normal ({item.quantity} unit):</span>
              <span className="font-mono">{formatRupiah(grossTotal)}</span>
            </div>
            
            <div className="flex justify-between text-emerald-700 font-medium">
              <span>Potongan Diskon Item:</span>
              <span className="font-mono">-{formatRupiah(previewDiscountAmount)}</span>
            </div>

            <div className="flex justify-between text-sm font-bold text-slate-900 pt-1.5 border-t border-slate-200">
              <span>Harga Akhir Item:</span>
              <span className="font-mono text-blue-700">{formatRupiah(previewFinalPrice)}</span>
            </div>
          </div>

        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-2">
          {item.discountAmount && item.discountAmount > 0 ? (
            <button
              type="button"
              onClick={handleRemove}
              className="px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50 rounded-xl border border-red-200 flex items-center gap-1.5 transition"
            >
              <Trash2 size={14} />
              <span>Hapus Diskon</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-xl transition"
            >
              Batal
            </button>
          )}

          <div className="flex items-center gap-2 ml-auto">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-xl transition"
            >
              Tutup
            </button>
            <button
              type="button"
              id="apply-item-discount-btn"
              onClick={handleApply}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 transition"
            >
              <Check size={14} />
              <span>Terapkan Diskon</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
