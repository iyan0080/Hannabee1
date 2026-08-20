import React, { useState, useMemo, useRef } from 'react';
import { useWarung } from '../context/WarungContext';
import { Product, ProductCategory, ProductVariant } from '../types';
import { formatRupiah } from '../utils/format';
import { exportProductsToExcel } from '../utils/exportData';
import { processMenuImage, formatBytes, MAX_IMAGE_SIZE_BYTES } from '../utils/imageCompressor';
import {
  Plus,
  Search,
  FileSpreadsheet,
  Edit2,
  Trash2,
  Layers,
  CheckCircle2,
  X,
  Package,
  Sparkles,
  AlertTriangle,
  Image as ImageIcon,
  Upload,
  Camera,
  Check,
  Archive,
  ArchiveRestore,
  FolderArchive,
  Eye,
  EyeOff,
  RefreshCw,
} from 'lucide-react';

const CATEGORIES: ProductCategory[] = [
  'Makanan',
  'Minuman',
  'Snack & Gorengan',
  'Sembako & Kebutuhan',
  'Rokok & Pulsa',
  'Lainnya',
];

export type ProductStatusTab = 'ALL_ACTIVE' | 'AVAILABLE' | 'UNAVAILABLE' | 'ARCHIVED';

export const MenuManagementView: React.FC = () => {
  const { products, addProduct, updateProduct, deleteProduct, updateStock, toggleArchiveProduct, storeSettings } = useWarung();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'ALL' | ProductCategory>('ALL');
  const [statusFilter, setStatusFilter] = useState<ProductStatusTab>('ALL_ACTIVE');

  // Modal Product State
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form Fields
  const [name, setName] = useState('');
  const [category, setCategory] = useState<ProductCategory>('Makanan');
  const [basePrice, setBasePrice] = useState<number | ''>('');
  const [baseCost, setBaseCost] = useState<number | ''>('');
  const [stock, setStock] = useState<number | ''>(50);
  const [unit, setUnit] = useState('porsi');
  const [emoji, setEmoji] = useState('🍽️');
  const [imageUrl, setImageUrl] = useState('');
  const [imageSizeFormatted, setImageSizeFormatted] = useState('');
  const [imageLoading, setImageLoading] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const [isAvailable, setIsAvailable] = useState(true);
  const [isArchived, setIsArchived] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Dynamic Variants Builder
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [newVarName, setNewVarName] = useState('');
  const [newVarPrice, setNewVarPrice] = useState<number | ''>('');
  const [newVarCost, setNewVarCost] = useState<number | ''>('');

  // Counts for tabs
  const activeProducts = useMemo(() => products.filter(p => !p.isArchived), [products]);
  const availableProducts = useMemo(() => products.filter(p => !p.isArchived && p.isAvailable), [products]);
  const unavailableProducts = useMemo(() => products.filter(p => !p.isArchived && !p.isAvailable), [products]);
  const archivedProducts = useMemo(() => products.filter(p => p.isArchived), [products]);

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      // 1. Status Filter
      if (statusFilter === 'ALL_ACTIVE' && p.isArchived) return false;
      if (statusFilter === 'AVAILABLE' && (p.isArchived || !p.isAvailable)) return false;
      if (statusFilter === 'UNAVAILABLE' && (p.isArchived || p.isAvailable)) return false;
      if (statusFilter === 'ARCHIVED' && !p.isArchived) return false;

      // 2. Search & Category Filter
      const matchSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchCat = selectedCategory === 'ALL' || p.category === selectedCategory;
      return matchSearch && matchCat;
    });
  }, [products, searchQuery, selectedCategory, statusFilter]);

  const openAddModal = () => {
    setEditingId(null);
    setName('');
    setCategory('Makanan');
    setBasePrice('');
    setBaseCost('');
    setStock(50);
    setUnit('porsi');
    setEmoji('🍽️');
    setImageUrl('');
    setImageSizeFormatted('');
    setImageError(null);
    setIsAvailable(true);
    setIsArchived(false);
    setVariants([]);
    setShowModal(true);
  };

  const openEditModal = (p: Product) => {
    setEditingId(p.id);
    setName(p.name);
    setCategory(p.category);
    setBasePrice(p.basePrice);
    setBaseCost(p.baseCost);
    setStock(p.stock);
    setUnit(p.unit);
    setEmoji(p.emoji || '🍽️');
    setImageUrl(p.imageUrl || '');
    setImageSizeFormatted(p.imageUrl ? 'Tersimpan' : '');
    setImageError(null);
    setIsAvailable(p.isAvailable);
    setIsArchived(!!p.isArchived);
    setVariants(p.variants || []);
    setShowModal(true);
  };

  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImageLoading(true);
    setImageError(null);

    try {
      const result = await processMenuImage(file);
      if (result.success && result.dataUrl) {
        setImageUrl(result.dataUrl);
        setImageSizeFormatted(result.sizeFormatted || 'Siap');
      } else {
        setImageError(result.errorMessage || 'Gagal memproses gambar foto menu.');
      }
    } catch (err: any) {
      setImageError('Terjadi kesalahan saat mengunggah foto.');
    } finally {
      setImageLoading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveImage = () => {
    setImageUrl('');
    setImageSizeFormatted('');
    setImageError(null);
  };

  const handleAddVariant = () => {
    if (!newVarName.trim()) return;
    const newVariant: ProductVariant = {
      id: 'var-' + Date.now(),
      name: newVarName.trim(),
      priceAdjustment: Number(newVarPrice) || 0,
      costAdjustment: Number(newVarCost) || 0,
    };
    setVariants([...variants, newVariant]);
    setNewVarName('');
    setNewVarPrice('');
    setNewVarCost('');
  };

  const handleRemoveVariant = (id: string) => {
    setVariants(variants.filter(v => v.id !== id));
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || basePrice === '' || baseCost === '') return;

    const productPayload = {
      name: name.trim(),
      category,
      basePrice: Number(basePrice),
      baseCost: Number(baseCost),
      stock: Number(stock) || 0,
      unit,
      emoji: emoji || '🍽️',
      imageUrl: imageUrl.trim() || undefined,
      isAvailable: isArchived ? false : isAvailable,
      isArchived,
      variants,
    };

    if (editingId) {
      updateProduct(editingId, productPayload);
    } else {
      addProduct(productPayload);
    }

    setShowModal(false);
  };

  return (
    <div className="max-w-7xl mx-auto p-3 sm:p-5 space-y-5">
      
      {/* Header */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-blue-100 text-blue-800 flex items-center justify-center font-bold">
              📋
            </span>
            <h2 className="text-base sm:text-lg font-bold text-slate-900">
              Katalog Menu & Varian Produk
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Kelola foto menu (maks 1MB), arsipkan menu tidak tersedia, HPP modal, opsi varian tambahan harga, dan stok barang.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            id="export-menu-excel-btn"
            onClick={() => exportProductsToExcel(filteredProducts, storeSettings)}
            className="px-3.5 py-2 bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs transition"
          >
            <FileSpreadsheet size={15} className="text-slate-600" />
            <span>Ekspor Excel</span>
          </button>

          <button
            id="open-add-product-modal-btn"
            onClick={openAddModal}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs transition"
          >
            <Plus size={16} />
            <span>+ Tambah Menu / Produk</span>
          </button>
        </div>
      </div>

      {/* Status Filter Tabs (Semua Aktif, Tersedia, Habis, Diarsipkan) */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        <button
          onClick={() => setStatusFilter('ALL_ACTIVE')}
          className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition flex items-center gap-1.5 ${
            statusFilter === 'ALL_ACTIVE'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <span>Semua Menu Aktif</span>
          <span className={`px-1.5 py-0.2 rounded-md text-[10px] font-bold ${statusFilter === 'ALL_ACTIVE' ? 'bg-slate-700 text-white' : 'bg-slate-100 text-slate-600'}`}>
            {activeProducts.length}
          </span>
        </button>

        <button
          onClick={() => setStatusFilter('AVAILABLE')}
          className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition flex items-center gap-1.5 ${
            statusFilter === 'AVAILABLE'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
          <span>Tersedia di Kasir</span>
          <span className={`px-1.5 py-0.2 rounded-md text-[10px] font-bold ${statusFilter === 'AVAILABLE' ? 'bg-emerald-700 text-white' : 'bg-emerald-50 text-emerald-700'}`}>
            {availableProducts.length}
          </span>
        </button>

        <button
          onClick={() => setStatusFilter('UNAVAILABLE')}
          className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition flex items-center gap-1.5 ${
            statusFilter === 'UNAVAILABLE'
              ? 'bg-amber-600 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-amber-400"></span>
          <span>Habis / Kosong</span>
          <span className={`px-1.5 py-0.2 rounded-md text-[10px] font-bold ${statusFilter === 'UNAVAILABLE' ? 'bg-amber-700 text-white' : 'bg-amber-50 text-amber-700'}`}>
            {unavailableProducts.length}
          </span>
        </button>

        <button
          onClick={() => setStatusFilter('ARCHIVED')}
          className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition flex items-center gap-1.5 ${
            statusFilter === 'ARCHIVED'
              ? 'bg-purple-700 text-white shadow-xs'
              : 'bg-white text-purple-700 hover:bg-purple-50 border border-purple-200'
          }`}
        >
          <FolderArchive size={14} />
          <span>📁 Menu Diarsipkan</span>
          <span className={`px-1.5 py-0.2 rounded-md text-[10px] font-bold ${statusFilter === 'ARCHIVED' ? 'bg-purple-900 text-white' : 'bg-purple-100 text-purple-800'}`}>
            {archivedProducts.length}
          </span>
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            id="menu-search-input"
            type="text"
            placeholder="Cari nama menu, minuman, sembako..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <select
          id="menu-category-filter"
          value={selectedCategory}
          onChange={e => setSelectedCategory(e.target.value as any)}
          className="w-full sm:w-64 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-medium"
        >
          <option value="ALL">Semua Kategori</option>
          {CATEGORIES.map(cat => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
      </div>

      {/* Products Grid & Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredProducts.map(product => {
          const estimatedMargin = product.basePrice - product.baseCost;
          const marginPercent = product.basePrice > 0 ? (estimatedMargin / product.basePrice) * 100 : 0;
          const hasImage = !!product.imageUrl;
          const isArchived = !!product.isArchived;

          return (
            <div
              key={product.id}
              className={`rounded-2xl border p-4 shadow-xs flex flex-col justify-between transition ${
                isArchived
                  ? 'bg-slate-50/80 border-dashed border-slate-300 opacity-90'
                  : product.isAvailable
                  ? 'bg-white border-slate-200'
                  : 'bg-white border-amber-200 ring-1 ring-amber-100'
              }`}
            >
              <div>
                {/* Top badges & Image/Emoji Banner */}
                <div className="flex items-start justify-between gap-3 mb-2.5">
                  <div className="flex items-center gap-3">
                    {hasImage ? (
                      <div className="w-14 h-14 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 shrink-0">
                        <img
                          src={product.imageUrl}
                          alt={product.name}
                          referrerPolicy="no-referrer"
                          className={`w-full h-full object-cover ${isArchived ? 'grayscale-50' : ''}`}
                        />
                      </div>
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-2xl shrink-0">
                        {product.emoji || '🍽️'}
                      </div>
                    )}
                    <div>
                      <h4 className={`font-bold text-sm leading-snug ${isArchived ? 'text-slate-600 line-through' : 'text-slate-900'}`}>
                        {product.name}
                      </h4>
                      <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">
                        {product.category}
                      </span>
                    </div>
                  </div>

                  {isArchived ? (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 bg-purple-100 text-purple-800 flex items-center gap-1 border border-purple-200">
                      <FolderArchive size={11} />
                      Diarsipkan
                    </span>
                  ) : product.isAvailable ? (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 bg-emerald-100 text-emerald-800">
                      Tersedia
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 bg-amber-100 text-amber-800">
                      Habis / Tidak Ada
                    </span>
                  )}
                </div>

                {/* Pricing & HPP details */}
                <div className="grid grid-cols-2 gap-2 my-3 p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 font-semibold block">HARGA JUAL:</span>
                    <span className="font-bold text-slate-900 font-mono text-sm">
                      {formatRupiah(product.basePrice)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-semibold block">HPP (MODAL):</span>
                    <span className="font-bold text-slate-600 font-mono">
                      {formatRupiah(product.baseCost)}
                    </span>
                  </div>
                  <div className="col-span-2 pt-1 border-t border-slate-200 flex justify-between text-[11px]">
                    <span className="text-slate-500">Estimasi Laba/Unit:</span>
                    <span className="font-bold text-emerald-700 font-mono">
                      {formatRupiah(estimatedMargin)} ({marginPercent.toFixed(0)}%)
                    </span>
                  </div>
                </div>

                {/* Stock Controls */}
                <div className="flex items-center justify-between text-xs text-slate-600 mb-3">
                  <span>Stok: <b>{product.stock} {product.unit}</b></span>
                  {!isArchived && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => updateStock(product.id, Math.max(0, product.stock - 5))}
                        className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 rounded text-[11px] font-bold"
                      >
                        -5
                      </button>
                      <button
                        onClick={() => updateStock(product.id, product.stock + 10)}
                        className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 rounded text-[11px] font-bold"
                      >
                        +10
                      </button>
                    </div>
                  )}
                </div>

                {/* Variants List Pill */}
                {product.variants && product.variants.length > 0 && (
                  <div className="space-y-1 mb-3 pt-2 border-t border-slate-100">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                      <Layers size={11} /> {product.variants.length} Varian Tambahan Harga:
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {product.variants.map(v => (
                        <span
                          key={v.id}
                          className="bg-blue-50 text-blue-800 text-[10px] font-medium px-2 py-0.5 rounded-lg border border-blue-100"
                        >
                          {v.name} (+{formatRupiah(v.priceAdjustment)})
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Card Actions */}
              <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <button
                    id={`edit-prod-${product.id}`}
                    onClick={() => openEditModal(product)}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1 transition"
                  >
                    <Edit2 size={13} /> Edit
                  </button>

                  {/* Archive / Unarchive Action Button */}
                  {isArchived ? (
                    <button
                      id={`unarchive-prod-${product.id}`}
                      onClick={() => toggleArchiveProduct(product.id)}
                      className="px-2.5 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-lg text-xs font-semibold flex items-center gap-1 transition"
                      title="Pulihkan dan aktifkan kembali menu ini"
                    >
                      <ArchiveRestore size={13} />
                      <span>Buka Arsip</span>
                    </button>
                  ) : (
                    <button
                      id={`archive-prod-${product.id}`}
                      onClick={() => {
                        if (confirm(`Arsipkan menu "${product.name}"? Menu ini akan disembunyikan dari layar kasir.`)) {
                          toggleArchiveProduct(product.id);
                        }
                      }}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition ${
                        !product.isAvailable
                          ? 'bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                      }`}
                      title="Arsipkan menu (sembunyikan dari kasir)"
                    >
                      <Archive size={13} />
                      <span>Arsipkan</span>
                    </button>
                  )}
                </div>

                <button
                  id={`delete-prod-${product.id}`}
                  onClick={() => {
                    if (confirm(`Yakin ingin menghapus permanen menu "${product.name}"?`)) {
                      deleteProduct(product.id);
                    }
                  }}
                  className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition"
                  title="Hapus Produk Permanen"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {filteredProducts.length === 0 && (
        <div className="bg-white rounded-2xl p-10 text-center border border-slate-200 space-y-3">
          <FolderArchive size={36} className="text-slate-400 mx-auto" />
          <p className="text-sm font-semibold text-slate-700">
            {statusFilter === 'ARCHIVED'
              ? 'Tidak ada menu yang sedang diarsipkan.'
              : 'Tidak ada produk yang sesuai dengan filter atau pencarian.'}
          </p>
          <p className="text-xs text-slate-400">
            {statusFilter === 'ARCHIVED'
              ? 'Menu yang tidak tersedia atau sudah tidak dijual dapat diarsipkan agar tidak memenuhi kasir.'
              : 'Coba ubah kata kunci pencarian atau kategori di atas.'}
          </p>
        </div>
      )}

      {/* Add / Edit Product Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full overflow-hidden border border-slate-200 max-h-[90vh] flex flex-col">
            <div className="p-4 bg-slate-900 text-white flex justify-between items-center">
              <h3 className="font-bold text-sm">
                {editingId ? 'Edit Menu & Foto Produk' : 'Tambah Menu / Produk Baru'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="p-5 space-y-4 overflow-y-auto flex-1 text-xs">
              
              {/* Photo Upload Section (Max 1MB) */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="font-semibold text-slate-800 flex items-center gap-1.5">
                    <ImageIcon size={14} className="text-blue-600" />
                    <span>Foto Menu / Produk (Maksimal 1 MB)</span>
                  </label>
                  <span className="text-[10px] text-slate-500 font-medium">
                    Maks 1 MB • Otomatis Dioptimasi
                  </span>
                </div>

                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  onChange={handleImageFileChange}
                  className="hidden"
                  id="menu-photo-file-input"
                />

                <div className="flex items-center gap-3">
                  {/* Photo Preview Thumbnail */}
                  <div className="relative w-20 h-20 rounded-xl bg-white border-2 border-dashed border-slate-300 flex items-center justify-center overflow-hidden shrink-0 group">
                    {imageUrl ? (
                      <>
                        <img
                          src={imageUrl}
                          alt="Preview Foto Menu"
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={handleRemoveImage}
                          className="absolute inset-0 bg-red-900/70 text-white opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center transition text-[10px] font-bold"
                          title="Hapus Foto"
                        >
                          <Trash2 size={14} />
                          <span>Hapus</span>
                        </button>
                      </>
                    ) : (
                      <div className="text-center p-1">
                        <ImageIcon size={20} className="text-slate-400 mx-auto" />
                        <span className="text-[9px] text-slate-400 block mt-0.5">Belum Ada</span>
                      </div>
                    )}
                  </div>

                  {/* Upload Controls & Status */}
                  <div className="flex-1 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={imageLoading}
                        className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 rounded-xl font-semibold text-slate-700 flex items-center gap-1.5 shadow-2xs transition"
                      >
                        <Upload size={13} className="text-blue-600" />
                        <span>{imageUrl ? 'Ganti Foto' : 'Pilih Foto / Kamera'}</span>
                      </button>

                      {imageUrl && (
                        <button
                          type="button"
                          onClick={handleRemoveImage}
                          className="px-2.5 py-1.5 text-red-600 hover:bg-red-50 rounded-xl text-xs font-semibold transition"
                        >
                          Hapus
                        </button>
                      )}
                    </div>

                    {imageLoading && (
                      <p className="text-[11px] text-blue-600 animate-pulse font-medium">
                        Memproses dan mengoptimasi foto (Maks 1MB)...
                      </p>
                    )}

                    {imageUrl && !imageLoading && (
                      <div className="flex items-center gap-1.5 text-[11px] text-emerald-700 font-semibold">
                        <CheckCircle2 size={12} />
                        <span>Foto siap digunakan ({imageSizeFormatted})</span>
                      </div>
                    )}

                    {imageError && (
                      <div className="flex items-center gap-1 text-[11px] text-red-600 font-medium">
                        <AlertTriangle size={12} />
                        <span>{imageError}</span>
                      </div>
                    )}

                    <p className="text-[10px] text-slate-400">
                      * Mendukung kamera HP, format JPG, PNG, WEBP.
                    </p>
                  </div>
                </div>
              </div>

              {/* Product Basic Info */}
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block font-medium text-slate-700 mb-1">Nama Produk / Menu *</label>
                  <input
                    id="product-name-input"
                    type="text"
                    required
                    placeholder="Contoh: Nasi Goreng Spesial"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 text-slate-900 font-semibold"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Icon Emoji</label>
                  <input
                    type="text"
                    maxLength={3}
                    value={emoji}
                    onChange={e => setEmoji(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-center text-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Kategori *</label>
                  <select
                    id="product-category-select"
                    value={category}
                    onChange={e => setCategory(e.target.value as ProductCategory)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                  >
                    {CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">Satuan</label>
                  <input
                    type="text"
                    placeholder="porsi, pcs, gelas, kg, bungkus"
                    value={unit}
                    onChange={e => setUnit(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                  />
                </div>
              </div>

              {/* Price & Cost */}
              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div>
                  <label className="block font-semibold text-slate-800 mb-1">Harga Jual Dasar (Rp) *</label>
                  <input
                    id="product-price-input"
                    type="number"
                    required
                    min="0"
                    step="500"
                    placeholder="15000"
                    value={basePrice}
                    onChange={e => setBasePrice(Number(e.target.value) || '')}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-mono font-bold text-blue-900"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-800 mb-1">HPP Modal Dasar (Rp) *</label>
                  <input
                    id="product-cost-input"
                    type="number"
                    required
                    min="0"
                    step="500"
                    placeholder="8000"
                    value={baseCost}
                    onChange={e => setBaseCost(Number(e.target.value) || '')}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-mono font-bold text-slate-700"
                  />
                </div>
              </div>

              {/* Stock, Availability and Archive Status */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <div className="grid grid-cols-2 gap-3 items-center">
                  <div>
                    <label className="block font-medium text-slate-700 mb-1">Stok Awal</label>
                    <input
                      type="number"
                      min="0"
                      value={stock}
                      onChange={e => setStock(Number(e.target.value) || 0)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-mono"
                    />
                  </div>

                  <div className="pt-4 flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="is-avail-check"
                      checked={isAvailable}
                      disabled={isArchived}
                      onChange={e => setIsAvailable(e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                    <label htmlFor="is-avail-check" className={`font-semibold ${isArchived ? 'text-slate-400 line-through' : 'text-slate-800'}`}>
                      Status Menu Tersedia
                    </label>
                  </div>
                </div>

                {/* Archive Toggle in Modal */}
                <div className="pt-2 border-t border-slate-200 flex items-start gap-2.5">
                  <input
                    type="checkbox"
                    id="is-archived-check"
                    checked={isArchived}
                    onChange={e => {
                      setIsArchived(e.target.checked);
                      if (e.target.checked) {
                        setIsAvailable(false);
                      }
                    }}
                    className="w-4 h-4 text-purple-600 rounded mt-0.5"
                  />
                  <div>
                    <label htmlFor="is-archived-check" className="font-semibold text-purple-900 flex items-center gap-1 cursor-pointer">
                      <FolderArchive size={13} className="text-purple-600" />
                      <span>Arsipkan Menu Ini (Sembunyikan dari Layar Kasir)</span>
                    </label>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      Gunakan ini untuk menu yang sudah tidak dijual / musiman agar tidak memenuhi daftar kasir, tanpa menghapus riwayat transaksi lama.
                    </p>
                  </div>
                </div>
              </div>

              {/* Dynamic Variants Builder */}
              <div className="p-3.5 bg-blue-50/50 rounded-xl border border-blue-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-blue-950 flex items-center gap-1.5">
                    <Layers size={14} className="text-blue-600" />
                    Manajemen Varian & Opsi Tambahan Harga
                  </span>
                  <span className="text-[10px] text-blue-700 font-medium">
                    {variants.length} Varian Dibuat
                  </span>
                </div>

                {/* Add Variant Form */}
                <div className="grid grid-cols-12 gap-2">
                  <div className="col-span-5">
                    <input
                      type="text"
                      placeholder="Nama Varian (misal: Telur Ceplok)"
                      value={newVarName}
                      onChange={e => setNewVarName(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-blue-200 rounded-lg text-xs"
                    />
                  </div>
                  <div className="col-span-3">
                    <input
                      type="number"
                      placeholder="+Harga (Rp)"
                      value={newVarPrice}
                      onChange={e => setNewVarPrice(Number(e.target.value) || '')}
                      className="w-full px-2 py-1.5 bg-white border border-blue-200 rounded-lg text-xs font-mono"
                    />
                  </div>
                  <div className="col-span-3">
                    <input
                      type="number"
                      placeholder="+Modal (Rp)"
                      value={newVarCost}
                      onChange={e => setNewVarCost(Number(e.target.value) || '')}
                      className="w-full px-2 py-1.5 bg-white border border-blue-200 rounded-lg text-xs font-mono"
                    />
                  </div>
                  <div className="col-span-1">
                    <button
                      type="button"
                      onClick={handleAddVariant}
                      className="w-full h-full bg-blue-600 text-white rounded-lg flex items-center justify-center font-bold"
                      title="Tambah Varian"
                    >
                      <Plus size={15} />
                    </button>
                  </div>
                </div>

                {/* Existing variants list */}
                {variants.length > 0 && (
                  <div className="space-y-1.5 pt-2 border-t border-blue-200/60">
                    {variants.map(v => (
                      <div
                        key={v.id}
                        className="flex items-center justify-between p-2 bg-white rounded-lg border border-blue-100"
                      >
                        <span className="font-semibold text-slate-800">{v.name}</span>
                        <div className="flex items-center gap-3">
                          <span className="font-mono text-emerald-700">+{formatRupiah(v.priceAdjustment)}</span>
                          <span className="font-mono text-slate-400 text-[10px]">HPP: +{formatRupiah(v.costAdjustment)}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveVariant(v.id)}
                            className="text-red-400 hover:text-red-600"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Modal Buttons */}
              <div className="pt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-600 rounded-xl font-medium hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  id="save-product-btn"
                  type="submit"
                  className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow-xs"
                >
                  {editingId ? 'Simpan Perubahan' : 'Simpan Produk Baru'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

