import React, { useState, useMemo, useEffect } from 'react';
import { formatRupiah } from '../utils/format';
import {
  calculateSmartCashSuggestions,
  calculateChangeBreakdown,
  CASH_DENOMINATIONS,
  SmartCashSuggestion,
} from '../utils/cashSuggestions';
import {
  X,
  Calculator,
  Coins,
  Banknote,
  CheckCircle2,
  RotateCcw,
  Delete,
  CornerDownLeft,
  ArrowRight,
  Plus,
  Minus,
  Sparkles,
  Info,
  Layers,
} from 'lucide-react';

interface CashCalculatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetAmount: number;
  currentCashGiven: number;
  onSelectAmount: (amount: number, andProcessCheckout?: boolean) => void;
}

export const CashCalculatorModal: React.FC<CashCalculatorModalProps> = ({
  isOpen,
  onClose,
  targetAmount,
  currentCashGiven,
  onSelectAmount,
}) => {
  // Input formula or numeric buffer
  const [displayValue, setDisplayValue] = useState<string>(
    currentCashGiven > 0 ? String(currentCashGiven) : String(targetAmount)
  );

  // Banknotes tapped tally: { 100000: 1, 50000: 2, ... }
  const [tappedNotes, setTappedNotes] = useState<{ [denom: number]: number }>({});

  // Active sub-mode: 'SUGGESTIONS' | 'KEYPAD' | 'TALLY'
  const [activeTab, setActiveTab] = useState<'SMART' | 'KEYPAD' | 'TALLY'>('SMART');

  // Sync with currentCashGiven when modal opens
  useEffect(() => {
    if (isOpen) {
      const initial = currentCashGiven > 0 ? currentCashGiven : targetAmount;
      setDisplayValue(String(initial));
      setTappedNotes({});
    }
  }, [isOpen, currentCashGiven, targetAmount]);

  // Evaluate the numeric value safely
  const numericCashGiven = useMemo(() => {
    try {
      // Clean display value to only allow math chars: numbers, +, -, *, /, (, )
      const sanitized = displayValue.replace(/[^0-9+\-*/.]/g, '');
      if (!sanitized) return 0;
      // Use Function constructor instead of eval for basic arithmetic
      // eslint-disable-next-line no-new-func
      const result = Function(`'use strict'; return (${sanitized})`)();
      return typeof result === 'number' && !isNaN(result) && isFinite(result) ? Math.max(0, Math.round(result)) : 0;
    } catch {
      // Fallback: parse direct digits
      const fallback = parseInt(displayValue.replace(/[^0-9]/g, ''), 10);
      return isNaN(fallback) ? 0 : fallback;
    }
  }, [displayValue]);

  // Smart suggestions
  const smartSuggestions = useMemo(() => {
    return calculateSmartCashSuggestions(targetAmount);
  }, [targetAmount]);

  // Kembalian (Change)
  const changeAmount = numericCashGiven >= targetAmount ? numericCashGiven - targetAmount : 0;
  const isShortage = numericCashGiven < targetAmount;
  const shortageAmount = targetAmount - numericCashGiven;

  // Breakdown of change
  const changeBreakdown = useMemo(() => {
    return calculateChangeBreakdown(changeAmount);
  }, [changeAmount]);

  // Keypad Handlers
  const handleDigit = (digit: string) => {
    setDisplayValue(prev => {
      if (prev === '0' && digit !== '+' && digit !== '-' && digit !== '*' && digit !== '/') {
        return digit;
      }
      return prev + digit;
    });
  };

  const handleOperator = (op: string) => {
    setDisplayValue(prev => {
      const trimmed = prev.trim();
      const lastChar = trimmed[trimmed.length - 1];
      if (['+', '-', '*', '/'].includes(lastChar)) {
        return trimmed.slice(0, -1) + op;
      }
      return trimmed + op;
    });
  };

  const handleBackspace = () => {
    setDisplayValue(prev => {
      if (prev.length <= 1) return '0';
      return prev.slice(0, -1);
    });
  };

  const handleClear = () => {
    setDisplayValue('0');
    setTappedNotes({});
  };

  // Tap-to-add cash note
  const handleAddNote = (denom: number) => {
    setTappedNotes(prev => {
      const nextCount = (prev[denom] || 0) + 1;
      const updated: { [denom: number]: number } = { ...prev, [denom]: nextCount };
      
      // calculate total from tapped notes
      const total = Object.entries(updated).reduce((sum, [val, count]) => {
        return sum + (Number(val) * Number(count));
      }, 0);

      setDisplayValue(String(total));
      return updated;
    });
  };

  const handleSubtractNote = (denom: number) => {
    setTappedNotes(prev => {
      const currentCount = prev[denom] || 0;
      if (currentCount <= 0) return prev;
      const updated: { [denom: number]: number } = { ...prev, [denom]: currentCount - 1 };
      if (updated[denom] === 0) delete updated[denom];

      const total = Object.entries(updated).reduce((sum, [val, count]) => {
        return sum + (Number(val) * Number(count));
      }, 0);

      setDisplayValue(String(total));
      return updated;
    });
  };

  const handleSelectSuggestion = (amt: number, autoSubmit: boolean = false) => {
    setDisplayValue(String(amt));
    setTappedNotes({});
    if (autoSubmit) {
      onSelectAmount(amt, true);
      onClose();
    }
  };

  const handleApply = (andCheckout: boolean = false) => {
    onSelectAmount(numericCashGiven, andCheckout);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full overflow-hidden border border-slate-200 flex flex-col max-h-[95vh] animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="bg-slate-900 text-white px-4 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold">
              <Calculator size={18} />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base flex items-center gap-2">
                Kalkulator Kasir & Uang Cepat
              </h3>
              <p className="text-[11px] text-slate-400">
                Saran pecahan nominal rupiah & hitung kembalian instan
              </p>
            </div>
          </div>
          <button
            id="close-cash-calc-modal-btn"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Top Summary Cards (Tagihan, Uang Diterima, Kembalian) */}
        <div className="bg-slate-50 p-3.5 border-b border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {/* 1. Total Tagihan */}
          <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs">
            <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold block">
              Total Tagihan:
            </span>
            <span className="text-base sm:text-lg font-bold font-mono text-slate-900 block mt-0.5">
              {formatRupiah(targetAmount)}
            </span>
          </div>

          {/* 2. Uang Diterima */}
          <div className="bg-blue-50/70 p-2.5 rounded-xl border border-blue-200 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase tracking-wider text-blue-800 font-bold">
                Uang Diterima:
              </span>
              <button
                type="button"
                onClick={handleClear}
                className="text-[10px] text-blue-600 hover:text-blue-800 font-semibold"
              >
                Reset
              </button>
            </div>
            <span className="text-base sm:text-lg font-bold font-mono text-blue-900 block mt-0.5">
              {formatRupiah(numericCashGiven)}
            </span>
            {displayValue.includes('+') || displayValue.includes('-') || displayValue.includes('*') ? (
              <span className="text-[10px] font-mono text-blue-600 truncate block">
                Rumus: {displayValue}
              </span>
            ) : null}
          </div>

          {/* 3. Kembalian / Kurang */}
          <div
            className={`p-2.5 rounded-xl border shadow-2xs ${
              isShortage
                ? 'bg-red-50 border-red-200'
                : numericCashGiven === targetAmount
                ? 'bg-emerald-50 border-emerald-200'
                : 'bg-emerald-500/10 border-emerald-300'
            }`}
          >
            <span
              className={`text-[10px] uppercase tracking-wider font-bold block ${
                isShortage
                  ? 'text-red-700'
                  : numericCashGiven === targetAmount
                  ? 'text-emerald-800'
                  : 'text-emerald-900'
              }`}
            >
              {isShortage ? 'Uang Masih Kurang:' : numericCashGiven === targetAmount ? 'Uang Pas:' : 'Kembalian Kasir:'}
            </span>
            <span
              className={`text-base sm:text-lg font-bold font-mono block mt-0.5 ${
                isShortage
                  ? 'text-red-700'
                  : numericCashGiven === targetAmount
                  ? 'text-emerald-800'
                  : 'text-emerald-700'
              }`}
            >
              {isShortage ? `-${formatRupiah(shortageAmount)}` : formatRupiah(changeAmount)}
            </span>
          </div>
        </div>

        {/* Tab Selection */}
        <div className="bg-slate-100 p-1.5 border-b border-slate-200 flex gap-1 text-xs font-semibold">
          <button
            type="button"
            id="tab-calc-smart-btn"
            onClick={() => setActiveTab('SMART')}
            className={`flex-1 py-1.5 px-2 rounded-xl flex items-center justify-center gap-1.5 transition ${
              activeTab === 'SMART'
                ? 'bg-white text-blue-700 shadow-2xs border border-blue-200 font-bold'
                : 'text-slate-600 hover:bg-white/60'
            }`}
          >
            <Sparkles size={14} className={activeTab === 'SMART' ? 'text-blue-600' : 'text-slate-400'} />
            <span>Saran Nominal Cepat</span>
          </button>

          <button
            type="button"
            id="tab-calc-tally-btn"
            onClick={() => setActiveTab('TALLY')}
            className={`flex-1 py-1.5 px-2 rounded-xl flex items-center justify-center gap-1.5 transition ${
              activeTab === 'TALLY'
                ? 'bg-white text-emerald-700 shadow-2xs border border-emerald-200 font-bold'
                : 'text-slate-600 hover:bg-white/60'
            }`}
          >
            <Banknote size={14} className={activeTab === 'TALLY' ? 'text-emerald-600' : 'text-slate-400'} />
            <span>Hitung Lembaran Uang</span>
          </button>

          <button
            type="button"
            id="tab-calc-keypad-btn"
            onClick={() => setActiveTab('KEYPAD')}
            className={`flex-1 py-1.5 px-2 rounded-xl flex items-center justify-center gap-1.5 transition ${
              activeTab === 'KEYPAD'
                ? 'bg-white text-slate-900 shadow-2xs border border-slate-300 font-bold'
                : 'text-slate-600 hover:bg-white/60'
            }`}
          >
            <Calculator size={14} className="text-slate-600" />
            <span>Keypad & Rumus</span>
          </button>
        </div>

        {/* Modal Body Content */}
        <div className="p-3 sm:p-4 overflow-y-auto space-y-3.5 flex-1">
          {/* TAB 1: SMART SUGGESTIONS */}
          {activeTab === 'SMART' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1">
                  <Sparkles size={14} className="text-amber-500" />
                  Pilih Nominal yang Diserahkan Pelanggan:
                </span>
                <span className="text-[10px] text-slate-500">Klik untuk langsung pilih</span>
              </div>

              {/* Grid of Smart Suggestions */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {smartSuggestions.map((sug, idx) => {
                  const isSelected = numericCashGiven === sug.amount;
                  return (
                    <button
                      key={idx}
                      type="button"
                      id={`suggestion-btn-${sug.amount}`}
                      onClick={() => handleSelectSuggestion(sug.amount)}
                      className={`p-2.5 rounded-xl border text-left flex flex-col justify-between transition active:scale-97 relative overflow-hidden ${
                        isSelected
                          ? 'border-blue-600 bg-blue-50/80 text-blue-950 ring-2 ring-blue-500/20 shadow-xs'
                          : 'border-slate-200 bg-white hover:border-blue-300 hover:bg-slate-50 text-slate-800 shadow-2xs'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-1">
                        <span className="font-bold text-xs sm:text-sm font-mono block">
                          {formatRupiah(sug.amount)}
                        </span>
                        {sug.isExact && (
                          <span className="px-1.5 py-0.2 rounded bg-emerald-600 text-white text-[9px] font-bold">
                            PAS
                          </span>
                        )}
                      </div>

                      <div className="mt-1.5 pt-1.5 border-t border-slate-100 flex items-center justify-between text-[10px]">
                        <span className="text-slate-500 font-medium truncate max-w-[85px]">
                          {sug.sublabel || (sug.isExact ? 'Uang Pas' : 'Pecahan')}
                        </span>
                        <span className={`font-mono font-semibold ${sug.change > 0 ? 'text-emerald-700' : 'text-slate-400'}`}>
                          {sug.change > 0 ? `+${formatRupiah(sug.change)}` : 'Rp 0'}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Quick Standard Currency Notes Bar */}
              <div className="pt-2">
                <label className="block text-[11px] font-bold text-slate-700 mb-1.5">
                  Pecahan Standar Rupiah:
                </label>
                <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5">
                  {CASH_DENOMINATIONS.filter(d => d.value >= 1000).map(d => (
                    <button
                      key={d.value}
                      type="button"
                      onClick={() => handleSelectSuggestion(d.value)}
                      className={`py-1.5 px-1 rounded-lg border text-center font-bold text-[11px] font-mono transition ${d.color} ${
                        numericCashGiven === d.value ? 'ring-2 ring-blue-500 font-extrabold shadow-xs' : ''
                      }`}
                    >
                      {d.shortLabel}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: TALLY / HITUNG LEMBARAN UANG (TAP TO ADD) */}
          {activeTab === 'TALLY' && (
            <div className="space-y-3">
              <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-2.5 text-xs text-emerald-950 flex items-start gap-2">
                <Info size={15} className="text-emerald-700 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">Hitung Uang Fisik dari Pembeli:</p>
                  <p className="text-[11px] text-emerald-800">
                    Klik tombol lembaran uang untuk menambah jumlah. Cocok saat pelanggan memberikan beberapa lembar uang kertas/koin.
                  </p>
                </div>
              </div>

              {/* Denomination buttons */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {CASH_DENOMINATIONS.map(d => {
                  const count = tappedNotes[d.value] || 0;
                  return (
                    <div
                      key={d.value}
                      className={`p-2.5 rounded-xl border flex flex-col justify-between transition ${
                        count > 0 ? 'border-emerald-500 bg-emerald-50/50 shadow-2xs' : 'border-slate-200 bg-white hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs font-mono text-slate-800">{d.label}</span>
                        {count > 0 && (
                          <span className="px-1.5 py-0.5 rounded-full bg-emerald-600 text-white font-bold text-[10px]">
                            {count}x
                          </span>
                        )}
                      </div>

                      <div className="flex items-center justify-between mt-2 pt-1 border-t border-slate-100">
                        <button
                          type="button"
                          disabled={count === 0}
                          onClick={() => handleSubtractNote(d.value)}
                          className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-red-50 hover:text-red-700 text-slate-600 disabled:opacity-30 flex items-center justify-center font-bold text-xs transition"
                        >
                          <Minus size={13} />
                        </button>
                        <span className="text-[10px] text-slate-400">
                          {d.type === 'KERTAS' ? 'Lembar' : 'Koin'}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleAddNote(d.value)}
                          className="w-7 h-7 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center font-bold text-xs shadow-2xs transition active:scale-95"
                        >
                          <Plus size={13} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {Object.keys(tappedNotes).length > 0 && (
                <div className="flex items-center justify-between pt-1">
                  <span className="text-xs text-slate-500">
                    Total lembaran: {Object.values(tappedNotes).reduce((s: number, c: number) => s + c, 0)} lembar/koin
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setTappedNotes({});
                      setDisplayValue('0');
                    }}
                    className="text-xs text-red-600 hover:underline font-semibold"
                  >
                    Reset Hitungan Lembaran
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: KEYPAD & CALC FORMULA */}
          {activeTab === 'KEYPAD' && (
            <div className="space-y-2.5">
              {/* Display Bar */}
              <div className="bg-slate-900 text-white p-3 rounded-xl flex items-center justify-between">
                <span className="text-xs font-mono text-slate-400">Input:</span>
                <span className="text-lg sm:text-xl font-bold font-mono tracking-wider">
                  {displayValue || '0'}
                </span>
              </div>

              {/* Calculator Keypad Grid */}
              <div className="grid grid-cols-4 gap-1.5">
                {/* Row 1 */}
                <button
                  type="button"
                  onClick={handleClear}
                  className="py-2.5 bg-red-100 hover:bg-red-200 text-red-800 rounded-xl font-bold text-xs transition"
                >
                  C (Clear)
                </button>
                <button
                  type="button"
                  onClick={() => handleOperator('/')}
                  className="py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-bold text-sm transition"
                >
                  ÷
                </button>
                <button
                  type="button"
                  onClick={() => handleOperator('*')}
                  className="py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-bold text-sm transition"
                >
                  ×
                </button>
                <button
                  type="button"
                  onClick={handleBackspace}
                  className="py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl flex items-center justify-center font-bold transition"
                >
                  <Delete size={16} />
                </button>

                {/* Row 2 */}
                {['7', '8', '9'].map(num => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => handleDigit(num)}
                    className="py-2.5 bg-slate-50 hover:bg-white text-slate-900 border border-slate-200 rounded-xl font-bold text-base font-mono shadow-2xs transition"
                  >
                    {num}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => handleOperator('-')}
                  className="py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-bold text-base transition"
                >
                  -
                </button>

                {/* Row 3 */}
                {['4', '5', '6'].map(num => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => handleDigit(num)}
                    className="py-2.5 bg-slate-50 hover:bg-white text-slate-900 border border-slate-200 rounded-xl font-bold text-base font-mono shadow-2xs transition"
                  >
                    {num}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => handleOperator('+')}
                  className="py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-bold text-base transition"
                >
                  +
                </button>

                {/* Row 4 */}
                {['1', '2', '3'].map(num => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => handleDigit(num)}
                    className="py-2.5 bg-slate-50 hover:bg-white text-slate-900 border border-slate-200 rounded-xl font-bold text-base font-mono shadow-2xs transition"
                  >
                    {num}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    // Evaluate formula
                    setDisplayValue(String(numericCashGiven));
                  }}
                  className="py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-base transition row-span-2 flex items-center justify-center"
                >
                  =
                </button>

                {/* Row 5 */}
                <button
                  type="button"
                  onClick={() => handleDigit('0')}
                  className="py-2.5 bg-slate-50 hover:bg-white text-slate-900 border border-slate-200 rounded-xl font-bold text-base font-mono shadow-2xs transition"
                >
                  0
                </button>
                <button
                  type="button"
                  onClick={() => handleDigit('00')}
                  className="py-2.5 bg-slate-50 hover:bg-white text-slate-900 border border-slate-200 rounded-xl font-bold text-sm font-mono shadow-2xs transition"
                >
                  00
                </button>
                <button
                  type="button"
                  onClick={() => handleDigit('000')}
                  className="py-2.5 bg-slate-50 hover:bg-white text-slate-900 border border-slate-200 rounded-xl font-bold text-sm font-mono shadow-2xs transition"
                >
                  000
                </button>
              </div>
            </div>
          )}

          {/* Rincian Pecahan Kembalian (Laci Kasir) */}
          {changeAmount > 0 && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-emerald-950 flex items-center gap-1.5">
                  <Coins size={14} className="text-emerald-700" />
                  Rekomendasi Pecahan Kembalian dari Laci Kasir:
                </span>
                <span className="font-bold font-mono text-emerald-800">
                  {formatRupiah(changeAmount)}
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5 pt-0.5">
                {changeBreakdown.map((item, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1 px-2 py-0.5 bg-white border border-emerald-300 rounded-lg text-xs font-semibold text-emerald-900 shadow-2xs"
                  >
                    <span className="text-emerald-700 font-bold">{item.count}x</span>
                    <span className="font-mono">{item.label}</span>
                    <span className="text-[9px] text-slate-400">({item.type === 'KERTAS' ? 'lbr' : 'koin'})</span>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Actions */}
        <div className="p-3 sm:p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-200 rounded-xl text-xs font-semibold transition"
          >
            Batal
          </button>

          <div className="w-full sm:w-auto flex items-center gap-2">
            <button
              type="button"
              id="apply-cash-only-btn"
              onClick={() => handleApply(false)}
              className="flex-1 sm:flex-initial px-4 py-2.5 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 rounded-xl text-xs font-bold transition shadow-2xs flex items-center justify-center gap-1.5"
            >
              <CornerDownLeft size={14} />
              <span>Gunakan Nominal ({formatRupiah(numericCashGiven)})</span>
            </button>

            <button
              type="button"
              id="apply-and-checkout-btn"
              disabled={isShortage}
              onClick={() => handleApply(true)}
              className="flex-1 sm:flex-initial px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-md flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <CheckCircle2 size={15} />
              <span>Bayar & Cetak Struk</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
