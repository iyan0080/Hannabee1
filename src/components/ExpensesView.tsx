import React, { useState, useMemo } from 'react';
import { useWarung } from '../context/WarungContext';
import { Expense, ExpenseCategory } from '../types';
import { formatRupiah, formatDate } from '../utils/format';
import { exportExpensesToExcel } from '../utils/exportData';
import {
  ArrowDownCircle,
  Plus,
  Search,
  FileSpreadsheet,
  Trash2,
  Tag,
  Calendar,
  X,
  CreditCard,
  Building,
} from 'lucide-react';

const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  'Belanja Bahan Baku',
  'Operasional & Listrik',
  'Sewa Tempat & Bangunan',
  'Gaji & Uang Makan Karyawan',
  'Peralatan & Kemasan',
  'Transportasi & Logistik',
  'Perawatan & Perbaikan',
  'Lain-lain',
];

export const ExpensesView: React.FC = () => {
  const { expenses, addExpense, deleteExpense, storeSettings } = useWarung();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'ALL' | ExpenseCategory>('ALL');

  // Modal form state
  const [showAddModal, setShowAddModal] = useState(false);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<ExpenseCategory>('Belanja Bahan Baku');
  const [amount, setAmount] = useState<number | ''>('');
  const [paymentMethod, setPaymentMethod] = useState<'TUNAI' | 'TRANSFER' | 'LAINNYA'>('TUNAI');
  const [recipient, setRecipient] = useState('');
  const [notes, setNotes] = useState('');

  // Filtered expenses
  const filteredExpenses = useMemo(() => {
    return expenses.filter(e => {
      const matchSearch =
        e.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (e.recipient && e.recipient.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (e.notes && e.notes.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchCat = selectedCategory === 'ALL' || e.category === selectedCategory;
      return matchSearch && matchCat;
    });
  }, [expenses, searchQuery, selectedCategory]);

  const totalExpense = filteredExpenses.reduce((s, e) => s + e.amount, 0);

  // Category breakdown calculation
  const categoryTotals = useMemo(() => {
    const map: { [key in ExpenseCategory]?: number } = {};
    expenses.forEach(e => {
      map[e.category] = (map[e.category] || 0) + e.amount;
    });
    return map;
  }, [expenses]);

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !amount || Number(amount) <= 0) return;

    addExpense({
      title: title.trim(),
      category,
      amount: Number(amount),
      paymentMethod,
      recipient: recipient.trim() || undefined,
      notes: notes.trim() || undefined,
      timestamp: new Date().toISOString(),
      cashierName: storeSettings.cashierName,
    });

    setShowAddModal(false);
    setTitle('');
    setAmount('');
    setRecipient('');
    setNotes('');
  };

  return (
    <div className="max-w-7xl mx-auto p-3 sm:p-5 space-y-5">
      
      {/* Header */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-red-100 text-red-700 flex items-center justify-center font-bold">
              💸
            </span>
            <h2 className="text-base sm:text-lg font-bold text-slate-900">
              Pencatatan Pengeluaran & Beban Warung
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Total Pengeluaran: <span className="font-bold text-red-700 font-mono">{formatRupiah(totalExpense)}</span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            id="export-expenses-excel-btn"
            onClick={() => exportExpensesToExcel(filteredExpenses, storeSettings)}
            className="px-3.5 py-2 bg-emerald-50 text-emerald-800 border border-emerald-300 hover:bg-emerald-100 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs transition"
          >
            <FileSpreadsheet size={15} className="text-emerald-700" />
            <span>Ekspor Excel</span>
          </button>

          <button
            id="open-add-expense-modal-btn"
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs transition"
          >
            <Plus size={16} />
            <span>Catat Pengeluaran Baru</span>
          </button>
        </div>
      </div>

      {/* Category Overview Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {EXPENSE_CATEGORIES.slice(0, 4).map(cat => (
          <div key={cat} className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
            <span className="text-[11px] text-slate-500 font-medium line-clamp-1">{cat}</span>
            <h4 className="text-sm font-bold text-slate-900 font-mono mt-1">
              {formatRupiah(categoryTotals[cat] || 0)}
            </h4>
          </div>
        ))}
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            id="expense-search-input"
            type="text"
            placeholder="Cari pengeluaran, toko tujuan, catatan..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <select
          id="expense-category-filter"
          value={selectedCategory}
          onChange={e => setSelectedCategory(e.target.value as any)}
          className="w-full sm:w-64 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-medium"
        >
          <option value="ALL">Semua Kategori Pengeluaran</option>
          {EXPENSE_CATEGORIES.map(cat => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
      </div>

      {/* Expenses Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-900 text-white uppercase text-[10px] tracking-wider font-semibold">
              <tr>
                <th className="px-4 py-3">Tanggal & Waktu</th>
                <th className="px-4 py-3">Keperluan / Judul</th>
                <th className="px-4 py-3">Kategori</th>
                <th className="px-4 py-3">Penerima / Toko</th>
                <th className="px-4 py-3 text-right">Jumlah (Rp)</th>
                <th className="px-4 py-3 text-center">Metode</th>
                <th className="px-4 py-3 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredExpenses.map(exp => (
                <tr key={exp.id} className="hover:bg-slate-50 transition">
                  <td className="px-4 py-3 whitespace-nowrap text-slate-500 font-mono">
                    {formatDate(exp.timestamp)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-semibold text-slate-900">{exp.title}</div>
                    {exp.notes && <div className="text-[11px] text-slate-400 italic">{exp.notes}</div>}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-red-50 text-red-700 border border-red-200">
                      {exp.category}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-slate-700">
                    {exp.recipient || '-'}
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-red-700 font-mono whitespace-nowrap">
                    {formatRupiah(exp.amount)}
                  </td>
                  <td className="px-4 py-3 text-center whitespace-nowrap text-slate-600 font-medium">
                    {exp.paymentMethod}
                  </td>
                  <td className="px-4 py-3 text-center whitespace-nowrap">
                    <button
                      id={`delete-expense-${exp.id}`}
                      onClick={() => {
                        if (confirm(`Hapus catatan pengeluaran "${exp.title}"?`)) {
                          deleteExpense(exp.id);
                        }
                      }}
                      className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition"
                      title="Hapus Pengeluaran"
                    >
                      <Trash2 size={15} />
                    </button>
                  </td>
                </tr>
              ))}

              {filteredExpenses.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-slate-400">
                    Belum ada data pengeluaran yang sesuai.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Expense Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden border border-slate-200">
            <div className="p-4 bg-slate-900 text-white flex justify-between items-center">
              <h3 className="font-bold text-sm">Catat Pengeluaran Baru</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="p-5 space-y-3.5 text-xs">
              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Keperluan / Judul Pengeluaran *
                </label>
                <input
                  id="expense-title-input"
                  type="text"
                  required
                  placeholder="Contoh: Belanja Ayam 5kg & Bumbu Pasar Pagi"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-red-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    Kategori Beban *
                  </label>
                  <select
                    id="expense-category-select"
                    value={category}
                    onChange={e => setCategory(e.target.value as ExpenseCategory)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                  >
                    {EXPENSE_CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    Nominal Biaya (Rp) *
                  </label>
                  <input
                    id="expense-amount-input"
                    type="number"
                    required
                    min="100"
                    step="500"
                    placeholder="Contoh: 150000"
                    value={amount}
                    onChange={e => setAmount(Number(e.target.value) || '')}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono font-bold text-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    Metode Bayar
                  </label>
                  <select
                    id="expense-method-select"
                    value={paymentMethod}
                    onChange={e => setPaymentMethod(e.target.value as any)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                  >
                    <option value="TUNAI">💵 Tunai (Kas Warung)</option>
                    <option value="TRANSFER">🏦 Transfer Bank</option>
                    <option value="LAINNYA">Lainnya</option>
                  </select>
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    Penerima / Nama Toko
                  </label>
                  <input
                    id="expense-recipient-input"
                    type="text"
                    placeholder="Contoh: Agen Telur Barokah"
                    value={recipient}
                    onChange={e => setRecipient(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Catatan / Keterangan Tambahan
                </label>
                <input
                  id="expense-notes-input"
                  type="text"
                  placeholder="Contoh: Termasuk ongkos antar Rp 5.000"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-600 rounded-xl font-medium"
                >
                  Batal
                </button>
                <button
                  id="save-expense-btn"
                  type="submit"
                  className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl"
                >
                  Simpan Pengeluaran
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
