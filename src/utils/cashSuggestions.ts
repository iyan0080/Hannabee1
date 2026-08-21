import { formatRupiah } from './format';

export interface SmartCashSuggestion {
  amount: number;
  label: string;
  sublabel?: string;
  badge?: string;
  isExact?: boolean;
  change: number;
}

export interface ChangeBreakdownItem {
  denomination: number;
  count: number;
  label: string;
  type: 'KERTAS' | 'LOGAM';
}

// Indonesian Rupiah common cash denominations
export const CASH_DENOMINATIONS = [
  { value: 100000, label: 'Rp 100.000', shortLabel: '100rb', type: 'KERTAS' as const, color: 'bg-red-500/10 text-red-700 border-red-200 hover:bg-red-500/20' },
  { value: 50000, label: 'Rp 50.000', shortLabel: '50rb', type: 'KERTAS' as const, color: 'bg-blue-500/10 text-blue-700 border-blue-200 hover:bg-blue-500/20' },
  { value: 20000, label: 'Rp 20.000', shortLabel: '20rb', type: 'KERTAS' as const, color: 'bg-emerald-500/10 text-emerald-700 border-emerald-200 hover:bg-emerald-500/20' },
  { value: 10000, label: 'Rp 10.000', shortLabel: '10rb', type: 'KERTAS' as const, color: 'bg-purple-500/10 text-purple-700 border-purple-200 hover:bg-purple-500/20' },
  { value: 5000, label: 'Rp 5.000', shortLabel: '5rb', type: 'KERTAS' as const, color: 'bg-amber-500/10 text-amber-800 border-amber-200 hover:bg-amber-500/20' },
  { value: 2000, label: 'Rp 2.000', shortLabel: '2rb', type: 'KERTAS' as const, color: 'bg-slate-500/10 text-slate-700 border-slate-200 hover:bg-slate-500/20' },
  { value: 1000, label: 'Rp 1.000', shortLabel: '1rb', type: 'LOGAM' as const, color: 'bg-zinc-500/10 text-zinc-700 border-zinc-200 hover:bg-zinc-500/20' },
  { value: 500, label: 'Rp 500', shortLabel: '500', type: 'LOGAM' as const, color: 'bg-slate-400/10 text-slate-600 border-slate-200 hover:bg-slate-400/20' },
];

/**
 * Calculates smart cash suggestions based on total bill amount.
 * Simulates real-world Indonesian customer cash payment habits.
 */
export function calculateSmartCashSuggestions(targetAmount: number): SmartCashSuggestion[] {
  if (targetAmount <= 0) {
    return [
      { amount: 10000, label: 'Rp 10.000', change: 10000 },
      { amount: 20000, label: 'Rp 20.000', change: 20000 },
      { amount: 50000, label: 'Rp 50.000', change: 50000 },
      { amount: 100000, label: 'Rp 100.000', change: 100000 },
    ];
  }

  const suggestions: SmartCashSuggestion[] = [];
  const addedAmounts = new Set<number>();

  const addSuggestion = (amount: number, label: string, sublabel?: string, badge?: string, isExact?: boolean) => {
    if (amount >= targetAmount && !addedAmounts.has(amount)) {
      addedAmounts.add(amount);
      suggestions.push({
        amount,
        label,
        sublabel,
        badge,
        isExact,
        change: amount - targetAmount,
      });
    }
  };

  // 1. Uang Pas (Exact Amount)
  addSuggestion(targetAmount, 'Uang Pas', formatRupiah(targetAmount), '⭐ Pas', true);

  // 2. Pembulatan Lembaran Standar Terdekat (5k, 10k, 20k, 50k, 100k)
  const roundSteps = [2000, 5000, 10000, 20000, 50000, 100000];
  roundSteps.forEach(step => {
    if (step > targetAmount * 0.1 || targetAmount > step) {
      const rounded = Math.ceil(targetAmount / step) * step;
      if (rounded > targetAmount) {
        let badge: string | undefined;
        let sublabel: string | undefined;

        if (step === 5000) {
          sublabel = 'Bulat 5 Ribu';
          badge = 'Kembalian ' + formatRupiah(rounded - targetAmount);
        } else if (step === 10000) {
          sublabel = 'Bulat 10 Ribu';
        } else if (step === 20000) {
          sublabel = 'Pecahan 20 Ribu';
        } else if (step === 50000) {
          sublabel = 'Pecahan 50 Ribu';
        } else if (step === 100000) {
          sublabel = 'Pecahan 100 Ribu';
        }

        addSuggestion(rounded, formatRupiah(rounded), sublabel, badge);
      }
    }
  });

  // 3. Pecahan Standar Tunggal (Jika targetAmount <= nominal)
  [2000, 5000, 10000, 20000, 50000, 100000, 200000].forEach(denom => {
    if (denom >= targetAmount) {
      addSuggestion(denom, formatRupiah(denom), '1 Lembar', 'Kembalian ' + formatRupiah(denom - targetAmount));
    }
  });

  // 4. Kasus Cerdas "Uang Receh / Kembalian Bulat" (Smart Coin/Odd Note combo)
  // Contoh: Total 23.000 -> Pelanggan bayar 25.000 (kembalian 2rb) atau 53.000 (kembalian genap 30rb)
  const remainder10k = targetAmount % 10000;
  if (remainder10k > 0) {
    // Saran 1: Bayar 50.000 + receh agar kembalian genap 10rb / 20rb
    if (targetAmount < 50000) {
      const oddFifty = 50000 + remainder10k;
      addSuggestion(oddFifty, formatRupiah(oddFifty), '50rb + Uang Pas Receh', 'Kembalian Genap Rp 50.000');
    }
    // Saran 2: Bayar 100.000 + receh agar kembalian genap
    if (targetAmount < 100000) {
      const oddHundred = 100000 + remainder10k;
      addSuggestion(oddHundred, formatRupiah(oddHundred), '100rb + Uang Pas Receh', 'Kembalian Genap Rp 100.000');
    }
  }

  const remainder50k = targetAmount % 50000;
  if (remainder50k > 0 && targetAmount < 100000 && remainder50k !== remainder10k) {
    const oddFifty = 100000 + remainder50k;
    addSuggestion(oddFifty, formatRupiah(oddFifty), '100rb + Receh', 'Kembalian Genap Rp 100.000');
  }

  // Sort suggestions by amount ascending
  return suggestions.sort((a, b) => a.amount - b.amount).slice(0, 8);
}

/**
 * Breakdown change into recommended physical notes and coins
 */
export function calculateChangeBreakdown(changeAmount: number): ChangeBreakdownItem[] {
  if (changeAmount <= 0) return [];

  let remaining = Math.round(changeAmount);
  const result: ChangeBreakdownItem[] = [];

  const denominations: { value: number; type: 'KERTAS' | 'LOGAM'; label: string }[] = [
    { value: 100000, type: 'KERTAS', label: 'Rp 100.000' },
    { value: 50000, type: 'KERTAS', label: 'Rp 50.000' },
    { value: 20000, type: 'KERTAS', label: 'Rp 20.000' },
    { value: 10000, type: 'KERTAS', label: 'Rp 10.000' },
    { value: 5000, type: 'KERTAS', label: 'Rp 5.000' },
    { value: 2000, type: 'KERTAS', label: 'Rp 2.000' },
    { value: 1000, type: 'LOGAM', label: 'Rp 1.000' },
    { value: 500, type: 'LOGAM', label: 'Rp 500' },
    { value: 200, type: 'LOGAM', label: 'Rp 200' },
    { value: 100, type: 'LOGAM', label: 'Rp 100' },
  ];

  for (const denom of denominations) {
    if (remaining >= denom.value) {
      const count = Math.floor(remaining / denom.value);
      if (count > 0) {
        result.push({
          denomination: denom.value,
          count,
          label: denom.label,
          type: denom.type,
        });
        remaining %= denom.value;
      }
    }
  }

  return result;
}
