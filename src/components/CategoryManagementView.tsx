import React, { useState, useMemo } from 'react';
import { useWarung } from '../context/WarungContext';
import { Category, Product } from '../types';
import { formatRupiah } from '../utils/format';
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  Package,
  Layers,
  Check,
  X,
  AlertTriangle,
  FolderTree,
  Boxes,
  ArrowRight,
  Eye,
  Info,
  Palette,
  Sparkles,
} from 'lucide-react';

// Preset emojis for retail / food / beverages
const PRESET_EMOJIS = [
  '🍛', '🍜', '🍲', '🍚', '🥩', '🍗', '🐟', '🍔', '🍕', '🌭',
  '🥤', '🧃', '☕', '🧋', '🍵', '🥛', '🍺', '🥟', '🍿', '🍞',
  '🌾', '🥚', '🧂', '🍫', '🍬', '🍦', '🍰', '📱', '🔋', '🧴',
  '🧼', '📦', '🏷️', '🧹', '🚬', '👕', '💊', '✨', '🛒', '🍽️',
];

// Color palette options with corresponding Tailwind classes
export const CATEGORY_COLORS: {
  id: string;
  name: string;
  bgLight: string;
  borderLight: string;
  textDark: string;
  badgeBg: string;
}[] = [
  { id: 'amber', name: 'Kuning / Amber', bgLight: 'bg-amber-50', borderLight: 'border-amber-200', textDark: 'text-amber-800', badgeBg: 'bg-amber-100 text-amber-800 border-amber-300' },
  { id: 'blue', name: 'Biru', bgLight: 'bg-blue-50', borderLight: 'border-blue-200', textDark: 'text-blue-800', badgeBg: 'bg-blue-100 text-blue-800 border-blue-300' },
  { id: 'emerald', name: 'Hijau / Emerald', bgLight: 'bg-emerald-50', borderLight: 'border-emerald-200', textDark: 'text-emerald-800', badgeBg: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
  { id: 'orange', name: 'Oranye', bgLight: 'bg-orange-50', borderLight: 'border-orange-200', textDark: 'text-orange-800', badgeBg: 'bg-orange-100 text-orange-800 border-orange-300' },
  { id: 'purple', name: 'Ungu', bgLight: 'bg-purple-50', borderLight: 'border-purple-200', textDark: 'text-purple-800', badgeBg: 'bg-purple-100 text-purple-800 border-purple-300' },
  { id: 'rose', name: 'Merah Muda / Rose', bgLight: 'bg-rose-50', borderLight: 'border-rose-200', textDark: 'text-rose-800', badgeBg: 'bg-rose-100 text-rose-800 border-rose-300' },
  { id: 'cyan', name: 'Cyan / Toska', bgLight: 'bg-cyan-50', borderLight: 'border-cyan-200', textDark: 'text-cyan-800', badgeBg: 'bg-cyan-100 text-cyan-800 border-cyan-300' },
  { id: 'indigo', name: 'Indigo', bgLight: 'bg-indigo-50', borderLight: 'border-indigo-200', textDark: 'text-indigo-800', badgeBg: 'bg-indigo-100 text-indigo-800 border-indigo-300' },
  { id: 'slate', name: 'Abu-abu / Netral', bgLight: 'bg-slate-50', borderLight: 'border-slate-200', textDark: 'text-slate-800', badgeBg: 'bg-slate-100 text-slate-800 border-slate-300' },
];

export function getCategoryColorStyle(colorName?: string) {
  const match = CATEGORY_COLORS.find(c => c.id === colorName);
  return match || CATEGORY_COLORS[CATEGORY_COLORS.length - 1]; // Default slate
}

interface CategoryManagementViewProps {
  onBackToMenu?: () => void;
}

export const CategoryManagementView: React.FC<CategoryManagementViewProps> = ({ onBackToMenu }) => {
  const { categories, products, addCategory, updateCategory, deleteCategory } = useWarung();

  const [searchQuery, setSearchQuery] = useState('');
  
  // Modal Form State (Add / Edit)
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [formName, setFormName] = useState('');
  const [formIcon, setFormIcon] = useState('🍛');
  const [formColor, setFormColor] = useState('amber');
  const [formDescription, setFormDescription] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  // Delete Confirmation State
  const [deletingCategory, setDeletingCategory] = useState<Category | null>(null);
  const [reassignTarget, setReassignTarget] = useState<string>('');

  // View Products in Category State
  const [viewingCategory, setViewingCategory] = useState<Category | null>(null);

  // Compute category statistics
  const categoryStats = useMemo(() => {
    const stats: {
      [categoryName: string]: {
        productCount: number;
        totalStock: number;
        totalCostValue: number;
        totalSellValue: number;
        products: Product[];
      };
    } = {};

    categories.forEach(cat => {
      stats[cat.name] = {
        productCount: 0,
        totalStock: 0,
        totalCostValue: 0,
        totalSellValue: 0,
        products: [],
      };
    });

    products.forEach(p => {
      const catName = p.category || 'Lainnya';
      if (!stats[catName]) {
        stats[catName] = {
          productCount: 0,
          totalStock: 0,
          totalCostValue: 0,
          totalSellValue: 0,
          products: [],
        };
      }
      stats[catName].productCount += 1;
      stats[catName].totalStock += Number(p.stock) || 0;
      stats[catName].totalCostValue += (Number(p.stock) || 0) * (Number(p.baseCost) || 0);
      stats[catName].totalSellValue += (Number(p.stock) || 0) * (Number(p.basePrice) || 0);
      stats[catName].products.push(p);
    });

    return stats;
  }, [categories, products]);

  // Overall totals
  const totalProducts = products.length;
  const totalCostOverall = products.reduce((acc, p) => acc + (p.stock * p.baseCost), 0);

  // Filtered categories
  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) return categories;
    const q = searchQuery.toLowerCase();
    return categories.filter(c =>
      c.name.toLowerCase().includes(q) ||
      (c.description && c.description.toLowerCase().includes(q))
    );
  }, [categories, searchQuery]);

  // Open Add Modal
  const openAddModal = () => {
    setEditingCategory(null);
    setFormName('');
    setFormIcon('🍽️');
    setFormColor('blue');
    setFormDescription('');
    setFormError(null);
    setShowModal(true);
  };

  // Open Edit Modal
  const openEditModal = (cat: Category) => {
    setEditingCategory(cat);
    setFormName(cat.name);
    setFormIcon(cat.icon || '🏷️');
    setFormColor(cat.color || 'slate');
    setFormDescription(cat.description || '');
    setFormError(null);
    setShowModal(true);
  };

  // Save Modal
  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const trimmed = formName.trim();
    if (!trimmed) {
      setFormError('Nama kategori wajib diisi.');
      return;
    }

    if (editingCategory) {
      // Edit
      const res = updateCategory(
        editingCategory.id,
        {
          name: trimmed,
          icon: formIcon,
          color: formColor,
          description: formDescription.trim(),
        },
        true // cascade rename to existing products
      );
      if (!res.success) {
        setFormError(res.message || 'Gagal memperbarui kategori.');
        return;
      }
    } else {
      // Add
      const res = addCategory({
        name: trimmed,
        icon: formIcon,
        color: formColor,
        description: formDescription.trim(),
      });
      if (!res.success) {
        setFormError(res.message || 'Gagal menambahkan kategori.');
        return;
      }
    }

    setShowModal(false);
  };

  // Open Delete Dialog
  const openDeleteDialog = (cat: Category) => {
    setDeletingCategory(cat);
    // Find default reassign target (other than current)
    const otherCat = categories.find(c => c.id !== cat.id);
    setReassignTarget(otherCat?.name || 'Lainnya');
  };

  // Confirm Delete
  const handleConfirmDelete = () => {
    if (!deletingCategory) return;
    deleteCategory(deletingCategory.id, reassignTarget);
    setDeletingCategory(null);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-200 flex items-center justify-center text-amber-600">
              <FolderTree size={22} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <span>Manajemen Kategori Barang</span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                  {categories.length} Kategori
                </span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Kelola kategori untuk mengelompokkan menu kasir POS, katalog produk, dan laporan penjualan
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {onBackToMenu && (
            <button
              onClick={onBackToMenu}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 flex items-center gap-1.5 transition-all"
            >
              <Boxes size={14} />
              <span>Lihat Katalog Produk</span>
            </button>
          )}

          <button
            id="btn-add-category"
            onClick={openAddModal}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white shadow-sm flex items-center gap-1.5 transition-all"
          >
            <Plus size={16} />
            <span>Tambah Kategori Baru</span>
          </button>
        </div>
      </div>

      {/* Metrics Summary Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
          <p className="text-[11px] font-medium text-slate-500">Total Kategori</p>
          <p className="text-xl font-bold text-slate-900 mt-0.5">{categories.length}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">Semua kelompok aktif</p>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
          <p className="text-[11px] font-medium text-slate-500">Total Produk Terkategori</p>
          <p className="text-xl font-bold text-blue-600 mt-0.5">{totalProducts} Item</p>
          <p className="text-[10px] text-slate-400 mt-0.5">Di seluruh menu & gudang</p>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
          <p className="text-[11px] font-medium text-slate-500">Estimasi Modal Stok (HPP)</p>
          <p className="text-xl font-bold text-emerald-600 mt-0.5">{formatRupiah(totalCostOverall)}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">Nilai aset barang warung</p>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
          <p className="text-[11px] font-medium text-slate-500">Kategori Terisi Produk</p>
          <p className="text-xl font-bold text-purple-600 mt-0.5">
            {categories.filter(c => (categoryStats[c.name]?.productCount || 0) > 0).length} / {categories.length}
          </p>
          <p className="text-[10px] text-slate-400 mt-0.5">Kategori dengan stok barang</p>
        </div>
      </div>

      {/* Search & Actions Bar */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            type="text"
            placeholder="Cari nama kategori atau deskripsi..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-amber-500 focus:outline-none"
          />
        </div>
        <div className="text-xs text-slate-500 font-medium whitespace-nowrap">
          Menampilkan <span className="font-bold text-slate-800">{filteredCategories.length}</span> dari {categories.length} kategori
        </div>
      </div>

      {/* Category Grid Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredCategories.map(cat => {
          const stats = categoryStats[cat.name] || {
            productCount: 0,
            totalStock: 0,
            totalCostValue: 0,
            totalSellValue: 0,
            products: [],
          };
          const colorStyle = getCategoryColorStyle(cat.color);

          return (
            <div
              key={cat.id}
              className={`bg-white rounded-2xl border ${colorStyle.borderLight} shadow-xs hover:shadow-md transition-all flex flex-col justify-between overflow-hidden`}
            >
              <div className="p-4">
                {/* Header card with icon and name */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shadow-2xs ${colorStyle.bgLight} border ${colorStyle.borderLight}`}
                    >
                      {cat.icon || '🏷️'}
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                        <span>{cat.name}</span>
                      </h3>
                      <span className={`inline-block mt-0.5 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${colorStyle.badgeBg}`}>
                        {stats.productCount} Produk
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEditModal(cat)}
                      title="Edit Kategori"
                      className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      <Edit2 size={15} />
                    </button>
                    <button
                      onClick={() => openDeleteDialog(cat)}
                      title="Hapus Kategori"
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>

                {/* Description */}
                <p className="text-xs text-slate-500 mt-3 line-clamp-2 min-h-[32px]">
                  {cat.description || <span className="italic text-slate-400">Tidak ada deskripsi</span>}
                </p>

                {/* Stats Info Box */}
                <div className="mt-3.5 bg-slate-50 p-2.5 rounded-xl border border-slate-100 grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 block font-medium">Total Stok Unit:</span>
                    <span className="font-bold text-slate-800">{stats.totalStock.toLocaleString('id-ID')} unit</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-medium">Nilai Modal (HPP):</span>
                    <span className="font-bold text-emerald-600">{formatRupiah(stats.totalCostValue)}</span>
                  </div>
                </div>
              </div>

              {/* Footer action to view products */}
              <div className="px-4 py-2.5 bg-slate-50/70 border-t border-slate-100 flex items-center justify-between">
                <button
                  onClick={() => setViewingCategory(cat)}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 transition-colors"
                >
                  <Eye size={13} />
                  <span>Lihat {stats.productCount} Produk</span>
                </button>
                <span className="text-[10px] text-slate-400">
                  Est. Jual: {formatRupiah(stats.totalSellValue)}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {filteredCategories.length === 0 && (
        <div className="bg-white p-12 text-center rounded-2xl border border-slate-200 shadow-xs">
          <FolderTree size={40} className="mx-auto text-slate-300 mb-3" />
          <h3 className="font-bold text-slate-700 text-sm">Tidak ada kategori yang cocok</h3>
          <p className="text-xs text-slate-500 mt-1">Coba sesuaikan kata kunci pencarian Anda atau tambahkan kategori baru.</p>
          <button
            onClick={openAddModal}
            className="mt-4 px-4 py-2 rounded-xl text-xs font-bold bg-amber-600 text-white hover:bg-amber-700 inline-flex items-center gap-1.5"
          >
            <Plus size={14} />
            <span>Tambah Kategori Baru</span>
          </button>
        </div>
      )}

      {/* MODAL: TAMBAH / EDIT KATEGORI */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in duration-150 my-auto max-h-[90vh] flex flex-col">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80 shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
                  <Palette size={16} />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">
                    {editingCategory ? 'Edit Kategori Barang' : 'Tambah Kategori Baru'}
                  </h3>
                  <p className="text-[10px] text-slate-500">
                    {editingCategory ? 'Perbarui informasi dan warna kategori' : 'Kategori baru untuk menu dan inventaris'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/60"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-5 space-y-4 overflow-y-auto">
              {formError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2">
                  <AlertTriangle size={15} className="shrink-0 mt-0.5" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Category Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nama Kategori <span className="text-rose-500">*</span>
                </label>
                <input
                  id="category-name-input"
                  type="text"
                  required
                  placeholder="Contoh: Makanan Berat, Aneka Kopi, Cemilan Gurih..."
                  value={formName}
                  onChange={e => setFormName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              {/* Icon / Emoji Picker */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                  <span>Pilih Ikon / Emoji</span>
                  <span className="text-[10px] font-normal text-slate-400">Pilih cepat atau ketik sendiri</span>
                </label>

                {/* Custom Emoji Input & Current Preview */}
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-xl shrink-0">
                    {formIcon || '🏷️'}
                  </div>
                  <input
                    type="text"
                    maxLength={4}
                    value={formIcon}
                    onChange={e => setFormIcon(e.target.value)}
                    placeholder="Ketik emoji..."
                    className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>

                {/* Preset Emojis Grid */}
                <div className="p-2 bg-slate-50 border border-slate-200 rounded-xl max-h-28 overflow-y-auto grid grid-cols-8 gap-1.5">
                  {PRESET_EMOJIS.map(emoji => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setFormIcon(emoji)}
                      className={`h-8 rounded-lg text-base flex items-center justify-center transition-all ${
                        formIcon === emoji
                          ? 'bg-amber-500 text-white scale-110 shadow-xs'
                          : 'hover:bg-white text-slate-700'
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              {/* Color Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Tema Warna Label Kategori
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {CATEGORY_COLORS.map(col => (
                    <button
                      key={col.id}
                      type="button"
                      onClick={() => setFormColor(col.id)}
                      className={`p-2 rounded-xl text-left border text-xs flex items-center gap-2 transition-all ${
                        formColor === col.id
                          ? 'border-amber-500 ring-2 ring-amber-400/30 bg-amber-50/50'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <span className={`w-3.5 h-3.5 rounded-full ${col.badgeBg.split(' ')[0]} border ${col.borderLight} shrink-0`} />
                      <span className="text-[11px] font-medium text-slate-700 truncate">{col.name.split('/')[0]}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Deskripsi / Keterangan (Opsional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Keterangan singkat produk yang termasuk dalam kategori ini..."
                  value={formDescription}
                  onChange={e => setFormDescription(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              {/* Live Preview */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                <span className="text-[11px] text-slate-500 font-medium">Pratinjau Label:</span>
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${getCategoryColorStyle(formColor).badgeBg}`}>
                  <span>{formIcon || '🏷️'}</span>
                  <span>{formName || 'Nama Kategori'}</span>
                </span>
              </div>

              {editingCategory && (
                <div className="p-2.5 rounded-xl bg-amber-50/70 border border-amber-200/80 text-[11px] text-amber-800 flex items-start gap-2">
                  <Info size={14} className="shrink-0 mt-0.5 text-amber-600" />
                  <span>
                    Jika nama diubah, semua produk yang memakai kategori <strong>"{editingCategory.name}"</strong> akan otomatis disinkronkan ke nama baru.
                  </span>
                </div>
              )}

              {/* Form Buttons */}
              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  Batal
                </button>
                <button
                  id="btn-save-category"
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white shadow-sm transition-all"
                >
                  {editingCategory ? 'Simpan Perubahan' : 'Tambah Kategori'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: KONFIRMASI HAPUS KATEGORI */}
      {deletingCategory && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in duration-150 my-auto max-h-[90vh] flex flex-col">
            <div className="p-5 text-center overflow-y-auto">
              <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-3">
                <AlertTriangle size={24} />
              </div>
              <h3 className="font-bold text-base text-slate-900">
                Hapus Kategori "{deletingCategory.name}"?
              </h3>

              {(() => {
                const affectedCount = categoryStats[deletingCategory.name]?.productCount || 0;
                if (affectedCount > 0) {
                  return (
                    <div className="mt-3 text-left space-y-3">
                      <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
                        <p className="font-semibold flex items-center gap-1.5">
                          <AlertTriangle size={14} className="shrink-0 text-amber-600" />
                          <span>Peringatan: Terdapat {affectedCount} produk di kategori ini!</span>
                        </p>
                        <p className="mt-1 text-[11px] text-amber-700">
                          Agar produk tidak hilang atau tanpa kategori, pilih kategori tujuan pemindahan di bawah ini:
                        </p>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Pindahkan {affectedCount} produk ke kategori:
                        </label>
                        <select
                          value={reassignTarget}
                          onChange={e => setReassignTarget(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-semibold focus:ring-2 focus:ring-amber-500"
                        >
                          {categories
                            .filter(c => c.id !== deletingCategory.id)
                            .map(c => (
                              <option key={c.id} value={c.name}>
                                {c.icon || '🏷️'} {c.name}
                              </option>
                            ))}
                        </select>
                      </div>
                    </div>
                  );
                } else {
                  return (
                    <p className="text-xs text-slate-500 mt-2">
                      Kategori ini belum memiliki produk terdaftar. Anda dapat menghapusnya dengan aman.
                    </p>
                  );
                }
              })()}

              <div className="mt-6 flex items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => setDeletingCategory(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  Batal
                </button>
                <button
                  id="btn-confirm-delete-category"
                  type="button"
                  onClick={handleConfirmDelete}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-sm transition-all"
                >
                  Hapus Kategori
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: LIHAT PRODUK DALAM KATEGORI */}
      {viewingCategory && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in duration-150 flex flex-col my-auto max-h-[85vh]">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50 shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{viewingCategory.icon || '🏷️'}</span>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">
                    Produk Kategori: {viewingCategory.name}
                  </h3>
                  <p className="text-[10px] text-slate-500">
                    {categoryStats[viewingCategory.name]?.productCount || 0} produk terdaftar
                  </p>
                </div>
              </div>
              <button
                onClick={() => setViewingCategory(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/60"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-4 overflow-y-auto space-y-2 flex-1">
              {(categoryStats[viewingCategory.name]?.products || []).length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-xs">
                  <Package size={32} className="mx-auto text-slate-300 mb-2" />
                  <p>Belum ada produk yang terdaftar di kategori ini.</p>
                </div>
              ) : (
                (categoryStats[viewingCategory.name]?.products || []).map(p => (
                  <div
                    key={p.id}
                    className="p-3 bg-slate-50 hover:bg-slate-100/80 rounded-xl border border-slate-200/80 flex items-center justify-between gap-3 transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="text-xl">{p.emoji || '🍽️'}</span>
                      <div>
                        <p className="font-bold text-xs text-slate-800">{p.name}</p>
                        <p className="text-[10px] text-slate-500">
                          Stok: <span className="font-semibold text-slate-700">{p.stock} {p.unit || 'porsi'}</span> • HPP: {formatRupiah(p.baseCost)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-xs text-amber-700">{formatRupiah(p.basePrice)}</p>
                      <span
                        className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                          p.isAvailable && !p.isArchived
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {p.isArchived ? 'Diarsipkan' : p.isAvailable ? 'Tersedia' : 'Habis'}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-end">
              <button
                type="button"
                onClick={() => setViewingCategory(null)}
                className="px-4 py-1.5 rounded-xl text-xs font-semibold bg-slate-200 text-slate-700 hover:bg-slate-300"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
