import React, { useState, useMemo } from 'react';
import { useWarung } from '../context/WarungContext';
import { ShoppingItem, ShoppingItemPriority, ShoppingItemStatus } from '../types';
import { formatRupiah, formatDate, openWhatsApp, cleanPhoneNumber } from '../utils/format';
import { pickContactFromPhone, isContactPickerSupported } from '../utils/contactPicker';
import {
  ClipboardList,
  Plus,
  Search,
  CheckCircle2,
  Circle,
  AlertTriangle,
  ShoppingBag,
  TrendingDown,
  FileSpreadsheet,
  Copy,
  Check,
  Trash2,
  Edit2,
  ArrowRight,
  Sparkles,
  Store,
  Tag,
  DollarSign,
  Calendar,
  X,
  CreditCard,
  Layers,
  CheckSquare,
  Square,
  ArrowDownCircle,
  ExternalLink,
  MessageCircle,
  Send,
  User,
  Users,
  Smartphone,
  Share2,
  Filter,
} from 'lucide-react';
import * as XLSX from 'xlsx';

const SHOPPING_CATEGORIES = [
  'Semua Kategori',
  'Bahan Baku Utama',
  'Bumbu & Sayuran',
  'Minuman & Sirup',
  'Kemasan & Plastik',
  'Gas & Perlengkapan',
  'Operasional Warung',
  'Lain-lain',
];

const COMMON_UNITS = [
  'kg',
  'ikat',
  'liter',
  'pcs',
  'pack',
  'karpet',
  'dus',
  'karton',
  'botol',
  'tabung',
  'bungkus',
  'gram',
  'butir',
  'porsi',
];

export const ShoppingListManager: React.FC = () => {
  const {
    shoppingItems,
    addShoppingItem,
    updateShoppingItem,
    deleteShoppingItem,
    toggleShoppingItemStatus,
    recordShoppingItemAsExpense,
    storeSettings,
    users,
  } = useWarung();

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Semua Kategori');
  const [selectedPriority, setSelectedPriority] = useState<'ALL' | ShoppingItemPriority>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'PURCHASED'>('ALL');
  const [marketChecklistMode, setMarketChecklistMode] = useState(false);
  const [copiedWa, setCopiedWa] = useState(false);

  // WhatsApp Modal state
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
  const [waRecipientPhone, setWaRecipientPhone] = useState('');
  const [waRecipientName, setWaRecipientName] = useState('');
  const [waScopeFilter, setWaScopeFilter] = useState<'PENDING' | 'URGENT' | 'ALL' | 'CUSTOM'>('PENDING');
  const [waSelectedCategory, setWaSelectedCategory] = useState('Semua Kategori');
  const [waIncludePrice, setWaIncludePrice] = useState(true);
  const [waIncludeLocation, setWaIncludeLocation] = useState(true);
  const [waIncludeNotes, setWaIncludeNotes] = useState(true);
  const [waIncludeReceiptReminder, setWaIncludeReceiptReminder] = useState(true);
  const [waSelectedItemIds, setWaSelectedItemIds] = useState<string[]>([]);
  const [isPickingContact, setIsPickingContact] = useState(false);

  // Add / Edit Modal
  const [showModal, setShowModal] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Bahan Baku Utama');
  const [quantity, setQuantity] = useState<number | ''>(1);
  const [unit, setUnit] = useState('kg');
  const [estimatedPrice, setEstimatedPrice] = useState<number | ''>('');
  const [actualPrice, setActualPrice] = useState<number | ''>('');
  const [priority, setPriority] = useState<ShoppingItemPriority>('NORMAL');
  const [supplierLocation, setSupplierLocation] = useState('');
  const [notes, setNotes] = useState('');

  // Record to Expense Confirmation Modal
  const [expenseItem, setExpenseItem] = useState<ShoppingItem | null>(null);
  const [expenseActualAmount, setExpenseActualAmount] = useState<number | ''>('');
  const [expensePaymentMethod, setExpensePaymentMethod] = useState<'TUNAI' | 'TRANSFER'>('TUNAI');

  // Filtered Items
  const filteredItems = useMemo(() => {
    return shoppingItems.filter(item => {
      const matchSearch =
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.supplierLocation && item.supplierLocation.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (item.notes && item.notes.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchCat =
        selectedCategory === 'Semua Kategori' || item.category === selectedCategory;

      const matchPriority =
        selectedPriority === 'ALL' || item.priority === selectedPriority;

      const matchStatus =
        statusFilter === 'ALL' ||
        (statusFilter === 'PENDING' && item.status !== 'PURCHASED') ||
        (statusFilter === 'PURCHASED' && item.status === 'PURCHASED');

      return matchSearch && matchCat && matchPriority && matchStatus;
    });
  }, [shoppingItems, searchQuery, selectedCategory, selectedPriority, statusFilter]);

  // Summary Metrics
  const pendingItems = shoppingItems.filter(s => s.status !== 'PURCHASED');
  const purchasedItems = shoppingItems.filter(s => s.status === 'PURCHASED');
  const urgentCount = shoppingItems.filter(s => s.status !== 'PURCHASED' && s.priority === 'URGENT').length;

  const totalEstimatedPendingBudget = pendingItems.reduce(
    (sum, item) => sum + (item.estimatedPrice || 0),
    0
  );
  const totalActualPurchasedSpend = purchasedItems.reduce(
    (sum, item) => sum + (item.actualPrice || item.estimatedPrice || 0),
    0
  );

  // Form Handlers
  const handleOpenAddModal = () => {
    setEditingItemId(null);
    setName('');
    setCategory('Bahan Baku Utama');
    setQuantity(1);
    setUnit('kg');
    setEstimatedPrice('');
    setActualPrice('');
    setPriority('NORMAL');
    setSupplierLocation('');
    setNotes('');
    setShowModal(true);
  };

  const handleOpenEditModal = (item: ShoppingItem) => {
    setEditingItemId(item.id);
    setName(item.name);
    setCategory(item.category);
    setQuantity(item.quantity);
    setUnit(item.unit);
    setEstimatedPrice(item.estimatedPrice || '');
    setActualPrice(item.actualPrice || '');
    setPriority(item.priority);
    setSupplierLocation(item.supplierLocation || '');
    setNotes(item.notes || '');
    setShowModal(true);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    if (editingItemId) {
      updateShoppingItem(editingItemId, {
        name: name.trim(),
        category,
        quantity: Number(quantity) || 1,
        unit,
        estimatedPrice: Number(estimatedPrice) || 0,
        actualPrice: actualPrice ? Number(actualPrice) : undefined,
        priority,
        supplierLocation: supplierLocation.trim() || undefined,
        notes: notes.trim() || undefined,
      });
    } else {
      addShoppingItem({
        name: name.trim(),
        category,
        quantity: Number(quantity) || 1,
        unit,
        estimatedPrice: Number(estimatedPrice) || 0,
        actualPrice: actualPrice ? Number(actualPrice) : undefined,
        priority,
        supplierLocation: supplierLocation.trim() || undefined,
        status: 'PENDING',
        notes: notes.trim() || undefined,
      });
    }

    setShowModal(false);
  };

  // Open Record Expense Modal
  const handleOpenRecordExpense = (item: ShoppingItem) => {
    setExpenseItem(item);
    setExpenseActualAmount(item.actualPrice || item.estimatedPrice || '');
    setExpensePaymentMethod('TUNAI');
  };

  const handleConfirmRecordExpense = () => {
    if (!expenseItem) return;
    const finalAmount = Number(expenseActualAmount) || expenseItem.actualPrice || expenseItem.estimatedPrice || 0;
    recordShoppingItemAsExpense(expenseItem.id, finalAmount, expensePaymentMethod);
    setExpenseItem(null);
  };

  // Open WhatsApp Modal with initial presets
  const handleOpenWhatsAppModal = (specificItem?: ShoppingItem) => {
    if (specificItem) {
      setWaScopeFilter('CUSTOM');
      setWaSelectedItemIds([specificItem.id]);
    } else {
      setWaScopeFilter('PENDING');
      setWaSelectedItemIds(pendingItems.map(i => i.id));
    }
    setWaRecipientPhone('');
    setWaRecipientName('');
    setShowWhatsAppModal(true);
  };

  // Contact Picker Handler from mobile
  const handlePickContact = async () => {
    setIsPickingContact(true);
    try {
      const res = await pickContactFromPhone();
      if (res.success && res.phone) {
        setWaRecipientPhone(res.phone);
        if (res.name) {
          setWaRecipientName(res.name);
        }
      } else if (res.message && !res.message.includes('dibatalkan')) {
        alert(res.message);
      }
    } catch (err: any) {
      console.warn('Contact picker error:', err);
    } finally {
      setIsPickingContact(false);
    }
  };

  // Items to include in WhatsApp text
  const waTargetItems = useMemo(() => {
    return shoppingItems.filter(item => {
      if (waScopeFilter === 'PENDING') {
        if (item.status === 'PURCHASED') return false;
      } else if (waScopeFilter === 'URGENT') {
        if (item.status === 'PURCHASED' || item.priority !== 'URGENT') return false;
      } else if (waScopeFilter === 'CUSTOM') {
        if (!waSelectedItemIds.includes(item.id)) return false;
      }

      if (waSelectedCategory !== 'Semua Kategori' && item.category !== waSelectedCategory) {
        return false;
      }

      return true;
    });
  }, [shoppingItems, waScopeFilter, waSelectedCategory, waSelectedItemIds]);

  const waTargetBudget = waTargetItems.reduce(
    (sum, item) => sum + (item.estimatedPrice || 0),
    0
  );

  // Generate WhatsApp Message text
  const generateWhatsAppMessage = () => {
    const greeting = waRecipientName ? `Halo Kak *${waRecipientName}*,\n` : '';
    let text = `${greeting}🛒 *CATATAN BELANJA & BAHAN BAKU*\n`;
    text += `🏬 *${storeSettings.storeName}*\n`;
    text += `📅 Tanggal: ${new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}\n`;
    if (storeSettings.phone) {
      text += `📞 Kontak: ${storeSettings.phone}\n`;
    }
    text += `----------------------------------------\n`;

    if (waTargetItems.length === 0) {
      text += `_Tidak ada catatan belanja yang dipilih._\n`;
    } else {
      let currentCat = '';
      waTargetItems.forEach((item, idx) => {
        if (item.category !== currentCat) {
          currentCat = item.category;
          text += `\n📦 *[${currentCat.toUpperCase()}]*\n`;
        }
        const urgentTag = item.priority === 'URGENT' ? ' 🔴 *HABIS/URGENT!*' : item.priority === 'HIGH' ? ' 🟠 *Penting*' : '';
        const priceText = waIncludePrice && item.estimatedPrice > 0 ? ` (~${formatRupiah(item.estimatedPrice)})` : '';
        const locText = waIncludeLocation && item.supplierLocation ? ` 📍 _[${item.supplierLocation}]_` : '';
        const checkStatus = item.status === 'PURCHASED' ? '[✓]' : '[ ]';

        text += `${checkStatus} ${idx + 1}. *${item.name}* - ${item.quantity} ${item.unit}${priceText}${urgentTag}${locText}\n`;
        
        if (waIncludeNotes && item.notes) {
          text += `    _Ket: ${item.notes}_\n`;
        }
      });
    }

    text += `\n----------------------------------------\n`;
    if (waIncludePrice && waTargetBudget > 0) {
      text += `💰 *Estimasi Total Anggaran : ${formatRupiah(waTargetBudget)}*\n`;
    }
    text += `📊 *Total Barang: ${waTargetItems.length} item*\n`;
    
    if (waIncludeReceiptReminder) {
      text += `\n📌 *Catatan untuk Petugas Belanja:*\n`;
      text += `1. Harap ceklis/beri tanda barang saat sudah dibeli.\n`;
      text += `2. *Wajib simpan nota/struk belanja* untuk pembukuan kas warung.\n`;
      text += `3. Jika ada stok habis/harga berbeda jauh, mohon konfirmasi terlebih dahulu.`;
    }

    return text;
  };

  // Direct Send to WhatsApp
  const handleSendWhatsApp = () => {
    if (waTargetItems.length === 0) {
      alert('Tidak ada barang belanjaan yang dipilih untuk dikirim.');
      return;
    }
    const message = generateWhatsAppMessage();
    openWhatsApp(waRecipientPhone, message);
    setShowWhatsAppModal(false);
  };

  // Copy shopping list to WhatsApp text format
  const handleCopyWhatsAppText = () => {
    if (waTargetItems.length === 0) {
      alert('Tidak ada barang belanjaan yang dipilih.');
      return;
    }
    const text = generateWhatsAppMessage();
    navigator.clipboard.writeText(text);
    setCopiedWa(true);
    setTimeout(() => setCopiedWa(false), 2500);
  };

  // Quick 1-click WhatsApp copy from header
  const handleQuickCopyWhatsAppList = () => {
    const activeItems = shoppingItems.filter(s => s.status !== 'PURCHASED');
    if (activeItems.length === 0) {
      alert('Tidak ada barang belanjaan yang berstatus pending/belum dibeli.');
      return;
    }

    let text = `🛒 *CATATAN BELANJA & BAHAN BAKU*\n`;
    text += `🏬 *${storeSettings.storeName}*\n`;
    text += `📅 Tanggal: ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}\n`;
    text += `----------------------------------------\n`;

    let currentCat = '';
    activeItems.forEach((item, idx) => {
      if (item.category !== currentCat) {
        currentCat = item.category;
        text += `\n📦 *[${currentCat.toUpperCase()}]*\n`;
      }
      const urgentTag = item.priority === 'URGENT' ? ' 🔴 *HABIS/URGENT!*' : item.priority === 'HIGH' ? ' 🟠 *Penting*' : '';
      const priceText = item.estimatedPrice > 0 ? ` (~${formatRupiah(item.estimatedPrice)})` : '';
      const locText = item.supplierLocation ? ` 📍 _[${item.supplierLocation}]_` : '';
      text += `[ ] ${idx + 1}. *${item.name}* - ${item.quantity} ${item.unit}${priceText}${urgentTag}${locText}\n`;
      if (item.notes) {
        text += `    _Ket: ${item.notes}_\n`;
      }
    });

    text += `\n----------------------------------------\n`;
    text += `💰 *Estimasi Total Anggaran : ${formatRupiah(totalEstimatedPendingBudget)}*\n`;
    text += `_Harap ceklis barang saat dibeli & simpan struk belanja._`;

    navigator.clipboard.writeText(text);
    setCopiedWa(true);
    setTimeout(() => setCopiedWa(false), 2500);
  };

  // Send single item to WhatsApp (e.g. quick order to supplier)
  const handleSendSingleItemToWA = (item: ShoppingItem) => {
    let msg = `Halo, saya mau pesan bahan berikut dari *${storeSettings.storeName}*:\n\n`;
    msg += `📦 *${item.name}*\n`;
    msg += `• Jumlah: *${item.quantity} ${item.unit}*\n`;
    if (item.estimatedPrice > 0) {
      msg += `• Estimasi Harga: ${formatRupiah(item.estimatedPrice)}\n`;
    }
    if (item.notes) {
      msg += `• Catatan/Merek: _${item.notes}_\n`;
    }
    msg += `\nMohon info ketersediaan stok & total biayanya ya. Terima kasih! 🙏`;

    openWhatsApp('', msg);
  };

  // Export to Excel
  const handleExportExcel = () => {
    const rows = shoppingItems.map((item, idx) => ({
      'No': idx + 1,
      'Nama Barang / Bahan': item.name,
      'Kategori': item.category,
      'Jumlah': item.quantity,
      'Satuan': item.unit,
      'Estimasi Harga (Rp)': item.estimatedPrice,
      'Realisasi Beli (Rp)': item.actualPrice || '-',
      'Prioritas': item.priority === 'URGENT' ? 'Mendesak (Habis)' : item.priority === 'HIGH' ? 'Penting' : item.priority === 'NORMAL' ? 'Normal' : 'Stok Tambahan',
      'Status': item.status === 'PURCHASED' ? 'Sudah Dibeli' : 'Belum Dibeli',
      'Tempat Belanja': item.supplierLocation || '-',
      'Dicatat ke Kas': item.isRecordedToExpense ? 'Ya (Buku Kas)' : 'Belum',
      'Catatan': item.notes || '-',
      'Tanggal Dibuat': formatDate(item.createdAt),
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Catatan Belanja');
    XLSX.writeFile(wb, `Catatan_Belanja_${storeSettings.storeName}_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  // Clean Completed Items
  const handleClearPurchased = () => {
    if (window.confirm('Hapus semua catatan barang yang sudah selesai dibeli?')) {
      purchasedItems.forEach(item => {
        deleteShoppingItem(item.id);
      });
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-3 sm:p-6 space-y-5">
      
      {/* 1. Top Header Card */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center font-bold shadow-2xs">
              <ClipboardList size={22} />
            </span>
            <div>
              <h1 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                <span>Catatan Belanja Barang & Bahan Baku</span>
                {urgentCount > 0 && (
                  <span className="text-[11px] font-bold bg-red-100 text-red-700 px-2 py-0.5 rounded-full animate-pulse border border-red-200">
                    🔴 {urgentCount} Bahan Habis!
                  </span>
                )}
              </h1>
              <p className="text-xs text-slate-500">
                Rencanakan belanja bahan baku warung, kirim daftar ke WhatsApp karyawan/suplier, dan bukukan ke kas otomatis.
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              id="shopping-mode-toggle-btn"
              onClick={() => setMarketChecklistMode(!marketChecklistMode)}
              className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-2xs ${
                marketChecklistMode
                  ? 'bg-amber-500 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
              title="Mode checklist cepat saat belanja di pasar"
            >
              <CheckSquare size={15} />
              <span>{marketChecklistMode ? 'Mode Biasa' : 'Mode Belanja Pasar'}</span>
            </button>

            {/* Main WhatsApp Button */}
            <button
              id="shopping-open-wa-modal-btn"
              onClick={() => handleOpenWhatsAppModal()}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-2xs group"
              title="Buka panel kirim catatan belanja ke WhatsApp"
            >
              <MessageCircle size={16} className="group-hover:scale-110 transition-transform" />
              <span>Kirim ke WhatsApp</span>
            </button>

            <button
              id="shopping-copy-wa-btn"
              onClick={handleQuickCopyWhatsAppList}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-2xs"
              title="Salin cepat teks catatan belanja ke clipboard"
            >
              {copiedWa ? <Check size={15} className="text-emerald-600" /> : <Copy size={15} />}
              <span>{copiedWa ? 'Tersalin!' : 'Salin Teks'}</span>
            </button>

            <button
              id="shopping-export-excel-btn"
              onClick={handleExportExcel}
              className="px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-2xs"
            >
              <FileSpreadsheet size={15} className="text-emerald-400" />
              <span>Excel</span>
            </button>

            <button
              id="shopping-add-item-btn"
              onClick={handleOpenAddModal}
              className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-xs"
            >
              <Plus size={16} />
              <span>+ Tambah Belanja</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. KPI Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col justify-between">
          <span className="text-[11px] font-semibold text-slate-500 flex items-center gap-1">
            <ShoppingBag size={13} className="text-blue-500" />
            <span>Rencana Belanja (Pending)</span>
          </span>
          <div className="mt-2">
            <div className="text-xl sm:text-2xl font-black text-slate-900">
              {pendingItems.length} <span className="text-xs font-medium text-slate-500">item</span>
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5">
              Barang/bahan belum dibeli
            </p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col justify-between">
          <span className="text-[11px] font-semibold text-slate-500 flex items-center gap-1">
            <DollarSign size={13} className="text-amber-500" />
            <span>Estimasi Budget Belanja</span>
          </span>
          <div className="mt-2">
            <div className="text-xl sm:text-2xl font-black text-amber-600">
              {formatRupiah(totalEstimatedPendingBudget)}
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5">
              Perkiraan dana yang dibutuhkan
            </p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col justify-between">
          <span className="text-[11px] font-semibold text-slate-500 flex items-center gap-1">
            <CheckCircle2 size={13} className="text-emerald-500" />
            <span>Sudah Selesai Dibeli</span>
          </span>
          <div className="mt-2">
            <div className="text-xl sm:text-2xl font-black text-emerald-600">
              {purchasedItems.length} <span className="text-xs font-medium text-slate-500">item</span>
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5">
              Total belanja berhasil
            </p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col justify-between">
          <span className="text-[11px] font-semibold text-slate-500 flex items-center gap-1">
            <ArrowDownCircle size={13} className="text-rose-500" />
            <span>Realisasi Pengeluaran</span>
          </span>
          <div className="mt-2">
            <div className="text-xl sm:text-2xl font-black text-slate-800">
              {formatRupiah(totalActualPurchasedSpend)}
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5">
              Dana yang sudah dikeluarkan
            </p>
          </div>
        </div>
      </div>

      {/* 3. Search & Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          
          {/* Search Bar */}
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
            <input
              id="search-shopping-input"
              type="text"
              placeholder="Cari nama bahan, toko/pasar, catatan..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Filter Dropdowns */}
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
            
            {/* Status Filter */}
            <div className="flex items-center gap-1 text-xs bg-slate-50 p-1 rounded-xl border border-slate-200">
              <button
                onClick={() => setStatusFilter('ALL')}
                className={`px-2.5 py-1 rounded-lg font-semibold transition ${
                  statusFilter === 'ALL' ? 'bg-white text-blue-700 shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Semua ({shoppingItems.length})
              </button>
              <button
                onClick={() => setStatusFilter('PENDING')}
                className={`px-2.5 py-1 rounded-lg font-semibold transition ${
                  statusFilter === 'PENDING' ? 'bg-amber-500 text-white shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Pending ({pendingItems.length})
              </button>
              <button
                onClick={() => setStatusFilter('PURCHASED')}
                className={`px-2.5 py-1 rounded-lg font-semibold transition ${
                  statusFilter === 'PURCHASED' ? 'bg-emerald-600 text-white shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Selesai ({purchasedItems.length})
              </button>
            </div>

            {/* Category Select */}
            <select
              value={selectedCategory}
              onChange={e => setSelectedCategory(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-semibold focus:outline-none cursor-pointer"
            >
              {SHOPPING_CATEGORIES.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>

            {/* Priority Select */}
            <select
              value={selectedPriority}
              onChange={e => setSelectedPriority(e.target.value as any)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-semibold focus:outline-none cursor-pointer"
            >
              <option value="ALL">Semua Prioritas</option>
              <option value="URGENT">🔴 Mendesak (Habis!)</option>
              <option value="HIGH">🟠 Prioritas Tinggi</option>
              <option value="NORMAL">🔵 Normal</option>
              <option value="LOW">⚪ Stok Tambahan</option>
            </select>

            {purchasedItems.length > 0 && (
              <button
                onClick={handleClearPurchased}
                className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition"
                title="Hapus semua item yang sudah dibeli"
              >
                <Trash2 size={16} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 4. Content Display (Market Checklist Mode vs Standard Detailed Mode) */}
      {marketChecklistMode ? (
        /* MARKET CHECKLIST MODE - Large touch-friendly cards for mobile market shopping */
        <div className="space-y-3">
          <div className="bg-amber-500 text-white p-3 rounded-xl flex items-center justify-between text-xs font-bold shadow-2xs">
            <div className="flex items-center gap-2">
              <CheckSquare size={16} />
              <span>Mode Belanja Pasar Aktif — Ketuk kotak/item untuk menandai barang sudah dibeli</span>
            </div>
            <span>{purchasedItems.length} / {shoppingItems.length} Selesai</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filteredItems.map(item => {
              const isPurchased = item.status === 'PURCHASED';
              return (
                <div
                  key={item.id}
                  onClick={() => toggleShoppingItemStatus(item.id)}
                  className={`p-4 rounded-2xl border transition cursor-pointer flex items-center justify-between gap-3 select-none ${
                    isPurchased
                      ? 'bg-slate-100/80 border-slate-200 opacity-60'
                      : 'bg-white border-slate-300 hover:border-blue-400 shadow-2xs hover:shadow-xs'
                  }`}
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <button
                      type="button"
                      className={`mt-0.5 w-6 h-6 rounded-lg flex items-center justify-center transition shrink-0 ${
                        isPurchased
                          ? 'bg-emerald-600 text-white'
                          : 'border-2 border-slate-400 hover:border-blue-600'
                      }`}
                    >
                      {isPurchased && <Check size={16} />}
                    </button>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-sm font-bold truncate ${isPurchased ? 'line-through text-slate-500' : 'text-slate-900'}`}>
                          {item.name}
                        </span>
                        {item.priority === 'URGENT' && !isPurchased && (
                          <span className="text-[10px] font-bold bg-red-100 text-red-700 px-1.5 py-0.2 rounded-md">
                            URGENT
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-600 mt-0.5">
                        <span className="font-bold text-slate-900">{item.quantity} {item.unit}</span>
                        {item.estimatedPrice > 0 && (
                          <span className="text-slate-400 ml-2">~{formatRupiah(item.estimatedPrice)}</span>
                        )}
                      </div>
                      {item.supplierLocation && (
                        <div className="text-[11px] text-amber-800 flex items-center gap-1 mt-1">
                          <Store size={11} />
                          <span>{item.supplierLocation}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0" onClick={e => e.stopPropagation()}>
                    <button
                      onClick={() => handleSendSingleItemToWA(item)}
                      className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-xl transition"
                      title="Kirim item ini ke WhatsApp"
                    >
                      <MessageCircle size={16} />
                    </button>
                    {!isPurchased && (
                      <button
                        onClick={() => handleOpenRecordExpense(item)}
                        className="px-2.5 py-1.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg text-[11px] font-bold hover:bg-blue-100"
                      >
                        + Catat Kas
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* STANDARD DETAILED TABLE MODE */
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
          {filteredItems.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto">
                <ClipboardList size={28} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-800">Daftar Belanja Masih Kosong</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  Catat bahan baku, kemasan, atau kebutuhan warung yang perlu dibelanjakan agar operasional selalu siap dan terencana.
                </p>
              </div>
              <div className="flex items-center justify-center gap-2">
                <button
                  onClick={handleOpenAddModal}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs inline-flex items-center gap-1.5 transition"
                >
                  <Plus size={15} />
                  <span>+ Buat Catatan Belanja</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900 text-white font-bold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-3 px-4 w-10 text-center">Status</th>
                    <th className="py-3 px-4">Nama Bahan / Barang</th>
                    <th className="py-3 px-3">Kategori</th>
                    <th className="py-3 px-3 text-right">Jumlah / Qty</th>
                    <th className="py-3 px-3 text-right">Estimasi Harga</th>
                    <th className="py-3 px-3 text-right">Realisasi Beli</th>
                    <th className="py-3 px-3 text-center">Prioritas</th>
                    <th className="py-3 px-3">Tempat Belanja</th>
                    <th className="py-3 px-4 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredItems.map((item) => {
                    const isPurchased = item.status === 'PURCHASED';

                    return (
                      <tr
                        key={item.id}
                        className={`hover:bg-slate-50 transition ${
                          isPurchased ? 'bg-slate-50/50 text-slate-500' : 'text-slate-800'
                        }`}
                      >
                        {/* Status Checkbox */}
                        <td className="py-3 px-4 text-center">
                          <button
                            type="button"
                            onClick={() => toggleShoppingItemStatus(item.id)}
                            className={`w-5 h-5 rounded-md flex items-center justify-center transition mx-auto ${
                              isPurchased
                                ? 'bg-emerald-600 text-white'
                                : 'border-2 border-slate-300 hover:border-blue-500'
                            }`}
                            title={isPurchased ? 'Tandai belum dibeli' : 'Tandai sudah dibeli'}
                          >
                            {isPurchased && <Check size={14} />}
                          </button>
                        </td>

                        {/* Name & Notes */}
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900 flex items-center gap-1.5">
                            <span className={isPurchased ? 'line-through text-slate-400' : ''}>
                              {item.name}
                            </span>
                            {item.isRecordedToExpense && (
                              <span className="text-[9px] font-bold bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded-md">
                                Tercatat di Kas
                              </span>
                            )}
                          </div>
                          {item.notes && (
                            <p className="text-[10px] text-slate-400 mt-0.5 italic">
                              {item.notes}
                            </p>
                          )}
                        </td>

                        {/* Category */}
                        <td className="py-3 px-3">
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-semibold">
                            {item.category}
                          </span>
                        </td>

                        {/* Quantity & Unit */}
                        <td className="py-3 px-3 text-right">
                          <span className="font-black text-sm text-slate-900">
                            {item.quantity}
                          </span>
                          <span className="text-[10px] text-slate-400 ml-1 font-medium">
                            {item.unit}
                          </span>
                        </td>

                        {/* Estimated Price */}
                        <td className="py-3 px-3 text-right font-mono text-slate-600">
                          {item.estimatedPrice > 0 ? formatRupiah(item.estimatedPrice) : '-'}
                        </td>

                        {/* Actual Price */}
                        <td className="py-3 px-3 text-right font-mono font-bold text-emerald-700">
                          {item.actualPrice ? formatRupiah(item.actualPrice) : isPurchased ? formatRupiah(item.estimatedPrice) : '-'}
                        </td>

                        {/* Priority Badge */}
                        <td className="py-3 px-3 text-center">
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                              item.priority === 'URGENT'
                                ? 'bg-red-100 text-red-800 border border-red-200'
                                : item.priority === 'HIGH'
                                ? 'bg-amber-100 text-amber-800'
                                : item.priority === 'NORMAL'
                                ? 'bg-blue-50 text-blue-800'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {item.priority === 'URGENT'
                              ? '🔴 Habis!'
                              : item.priority === 'HIGH'
                              ? '🟠 Penting'
                              : item.priority === 'NORMAL'
                              ? '🔵 Normal'
                              : '⚪ Tambahan'}
                          </span>
                        </td>

                        {/* Supplier / Market Location */}
                        <td className="py-3 px-3">
                          {item.supplierLocation ? (
                            <span className="text-[11px] text-slate-700 flex items-center gap-1">
                              <Store size={12} className="text-amber-600 shrink-0" />
                              <span className="truncate max-w-[120px]">{item.supplierLocation}</span>
                            </span>
                          ) : (
                            <span className="text-slate-300">-</span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-1">
                            {/* Send to WA button */}
                            <button
                              onClick={() => handleSendSingleItemToWA(item)}
                              className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition"
                              title="Kirim item ini ke WhatsApp"
                            >
                              <MessageCircle size={14} />
                            </button>

                            {!item.isRecordedToExpense && (
                              <button
                                onClick={() => handleOpenRecordExpense(item)}
                                className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-lg text-[10px] font-bold transition shadow-2xs"
                                title="Catat langsung ke Pengeluaran Operasional / Buku Kas"
                              >
                                + Buku Kas
                              </button>
                            )}

                            <button
                              onClick={() => handleOpenEditModal(item)}
                              className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                              title="Edit Catatan Belanja"
                            >
                              <Edit2 size={13} />
                            </button>

                            <button
                              onClick={() => deleteShoppingItem(item.id)}
                              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                              title="Hapus Catatan"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* 5. MODAL KIRIM KE WHATSAPP (Lengkap dengan Pilihan Penerima, Filter, & Preview) */}
      {showWhatsAppModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full overflow-hidden border border-slate-200 flex flex-col max-h-[92vh]">
            
            {/* Modal Header */}
            <div className="p-4 bg-emerald-700 text-white flex justify-between items-center shrink-0">
              <div className="flex items-center gap-2.5">
                <span className="w-8 h-8 rounded-xl bg-emerald-600/60 flex items-center justify-center">
                  <MessageCircle size={18} />
                </span>
                <div>
                  <h3 className="font-bold text-sm">Kirim Catatan Belanja ke WhatsApp</h3>
                  <p className="text-[11px] text-emerald-100">Kirim daftar belanja ke karyawan, kurir, suplier, atau grup warung</p>
                </div>
              </div>
              <button
                onClick={() => setShowWhatsAppModal(false)}
                className="text-emerald-200 hover:text-white p-1.5 rounded-xl hover:bg-emerald-800 transition"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1">
              
              {/* Target Penerima */}
              <div className="bg-slate-50 p-3.5 sm:p-4 rounded-2xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <User size={14} className="text-emerald-600" />
                    <span>Nomor WhatsApp Tujuan (Opsional)</span>
                  </label>
                  <button
                    type="button"
                    onClick={handlePickContact}
                    disabled={isPickingContact}
                    className="text-[11px] font-bold text-emerald-700 bg-emerald-100/70 hover:bg-emerald-200/80 px-2.5 py-1 rounded-lg flex items-center gap-1 transition"
                  >
                    <Smartphone size={13} />
                    <span>{isPickingContact ? 'Membuka Kontak...' : 'Cari Kontak HP'}</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <input
                      type="tel"
                      placeholder="Nomor WhatsApp (cth: 08123456789)"
                      value={waRecipientPhone}
                      onChange={e => setWaRecipientPhone(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-mono font-medium text-slate-900 focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <input
                      type="text"
                      placeholder="Nama Penerima (cth: Budi / Toko Sembako)"
                      value={waRecipientName}
                      onChange={e => setWaRecipientName(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                {/* Quick User Presets */}
                <div className="pt-1">
                  <div className="text-[10px] font-semibold text-slate-500 mb-1.5 flex items-center gap-1">
                    <Users size={12} />
                    <span>Pintasan Cepat Nomor Pengguna:</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {users.map(u => (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => {
                          setWaRecipientPhone(u.phone || '082178867116');
                          setWaRecipientName(u.name);
                        }}
                        className="px-2.5 py-1 bg-white hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 text-slate-700 hover:text-emerald-700 rounded-lg text-[11px] font-semibold transition flex items-center gap-1 shadow-2xs"
                      >
                        <span>{u.name} ({u.role})</span>
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => {
                        setWaRecipientPhone('');
                        setWaRecipientName('');
                      }}
                      className="px-2.5 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-[11px] font-semibold transition"
                    >
                      Buka WA Umum
                    </button>
                  </div>
                </div>
              </div>

              {/* Filter Cakupan Data Belanja */}
              <div className="space-y-3">
                <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Filter size={14} className="text-blue-600" />
                  <span>Pilih Data yang Akan Dikirim</span>
                </label>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() => setWaScopeFilter('PENDING')}
                    className={`p-2.5 rounded-xl border text-xs font-bold transition text-center ${
                      waScopeFilter === 'PENDING'
                        ? 'bg-amber-500 text-white border-amber-500 shadow-2xs'
                        : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-white'
                    }`}
                  >
                    📦 Belum Dibeli ({pendingItems.length})
                  </button>

                  <button
                    type="button"
                    onClick={() => setWaScopeFilter('URGENT')}
                    className={`p-2.5 rounded-xl border text-xs font-bold transition text-center ${
                      waScopeFilter === 'URGENT'
                        ? 'bg-red-600 text-white border-red-600 shadow-2xs'
                        : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-white'
                    }`}
                  >
                    🔴 Khusus Habis ({urgentCount})
                  </button>

                  <button
                    type="button"
                    onClick={() => setWaScopeFilter('ALL')}
                    className={`p-2.5 rounded-xl border text-xs font-bold transition text-center ${
                      waScopeFilter === 'ALL'
                        ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                        : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-white'
                    }`}
                  >
                    📑 Semua Item ({shoppingItems.length})
                  </button>

                  <button
                    type="button"
                    onClick={() => setWaScopeFilter('CUSTOM')}
                    className={`p-2.5 rounded-xl border text-xs font-bold transition text-center ${
                      waScopeFilter === 'CUSTOM'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                        : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-white'
                    }`}
                  >
                    ☑️ Pilih Manual ({waSelectedItemIds.length})
                  </button>
                </div>

                {/* Filter Kategori */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-600 font-semibold shrink-0">Kategori:</span>
                  <select
                    value={waSelectedCategory}
                    onChange={e => setWaSelectedCategory(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-800"
                  >
                    {SHOPPING_CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                {/* Manual Item Checkbox list if CUSTOM */}
                {waScopeFilter === 'CUSTOM' && (
                  <div className="max-h-40 overflow-y-auto border border-slate-200 rounded-xl p-2 bg-slate-50 space-y-1">
                    {shoppingItems.map(item => {
                      const isChecked = waSelectedItemIds.includes(item.id);
                      return (
                        <label
                          key={item.id}
                          className="flex items-center gap-2 p-1.5 hover:bg-white rounded-lg cursor-pointer text-xs"
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {
                              if (isChecked) {
                                setWaSelectedItemIds(waSelectedItemIds.filter(id => id !== item.id));
                              } else {
                                setWaSelectedItemIds([...waSelectedItemIds, item.id]);
                              }
                            }}
                            className="rounded text-emerald-600 focus:ring-emerald-500"
                          />
                          <span className="font-bold text-slate-800">{item.name}</span>
                          <span className="text-slate-500 font-medium">({item.quantity} {item.unit})</span>
                          {item.estimatedPrice > 0 && (
                            <span className="text-slate-400 ml-auto font-mono text-[11px]">{formatRupiah(item.estimatedPrice)}</span>
                          )}
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Pengaturan Detail Pesan */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2">
                <span className="text-[11px] font-bold text-slate-700 block">Opsi Informasi Tambahan:</span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-slate-700">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={waIncludePrice}
                      onChange={e => setWaIncludePrice(e.target.checked)}
                      className="rounded text-emerald-600"
                    />
                    <span>Estimasi Harga</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={waIncludeLocation}
                      onChange={e => setWaIncludeLocation(e.target.checked)}
                      className="rounded text-emerald-600"
                    />
                    <span>Tempat/Toko</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={waIncludeNotes}
                      onChange={e => setWaIncludeNotes(e.target.checked)}
                      className="rounded text-emerald-600"
                    />
                    <span>Catatan/Merek</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={waIncludeReceiptReminder}
                      onChange={e => setWaIncludeReceiptReminder(e.target.checked)}
                      className="rounded text-emerald-600"
                    />
                    <span>Pesan Struk Nota</span>
                  </label>
                </div>
              </div>

              {/* Pratinjau Teks WhatsApp (Live Preview) */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold text-slate-800">Pratinjau Pesan WhatsApp:</span>
                  <span className="text-[11px] text-emerald-700 font-semibold">{waTargetItems.length} item dipilih</span>
                </div>
                <div className="bg-emerald-950/90 text-emerald-100 p-3.5 rounded-2xl font-mono text-xs whitespace-pre-wrap leading-relaxed max-h-56 overflow-y-auto border border-emerald-800 shadow-inner select-all">
                  {generateWhatsAppMessage()}
                </div>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
              <div className="text-xs text-slate-500">
                {waRecipientPhone ? (
                  <span>Tujuan: <strong className="text-slate-800 font-mono">{waRecipientPhone}</strong> {waRecipientName ? `(${waRecipientName})` : ''}</span>
                ) : (
                  <span>Mode: <strong>Buka WhatsApp Web / App Langsung</strong></span>
                )}
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={handleCopyWhatsAppText}
                  className="px-3.5 py-2 border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-2xs"
                >
                  {copiedWa ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                  <span>{copiedWa ? 'Tersalin!' : 'Salin Teks'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleSendWhatsApp}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs transition"
                >
                  <Send size={15} />
                  <span>Kirim ke WhatsApp</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* 6. Modal Tambah / Edit Catatan Belanja */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200">
            <div className="p-4 bg-slate-900 text-white flex justify-between items-center">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <ClipboardList size={18} className="text-blue-400" />
                <span>{editingItemId ? 'Edit Catatan Belanja' : 'Tambah Catatan Belanja Bahan Baku'}</span>
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="p-5 space-y-3.5 max-h-[80vh] overflow-y-auto">
              
              {/* Nama Bahan / Barang */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Nama Barang / Bahan Baku *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Beras Ramos 25kg, Minyak Goreng Sania 2L, Cup Es 16oz"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-blue-500 font-semibold"
                />
              </div>

              {/* Kategori & Prioritas */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Kategori Bahan
                  </label>
                  <select
                    value={category}
                    onChange={e => setCategory(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs text-slate-800 font-medium focus:ring-2 focus:ring-blue-500"
                  >
                    {SHOPPING_CATEGORIES.filter(c => c !== 'Semua Kategori').map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Tingkat Kebutuhan / Prioritas
                  </label>
                  <select
                    value={priority}
                    onChange={e => setPriority(e.target.value as ShoppingItemPriority)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs text-slate-800 font-bold focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="URGENT">🔴 Mendesak (Habis!)</option>
                    <option value="HIGH">🟠 Prioritas Tinggi</option>
                    <option value="NORMAL">🔵 Normal</option>
                    <option value="LOW">⚪ Stok Tambahan</option>
                  </select>
                </div>
              </div>

              {/* Qty & Satuan */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Jumlah / Qty *
                  </label>
                  <input
                    type="number"
                    min="0.1"
                    step="any"
                    required
                    value={quantity}
                    onChange={e => setQuantity(Number(e.target.value) || '')}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs text-slate-900 font-mono font-bold focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Satuan
                  </label>
                  <select
                    value={unit}
                    onChange={e => setUnit(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs text-slate-800 font-medium focus:ring-2 focus:ring-blue-500"
                  >
                    {COMMON_UNITS.map(u => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Estimasi Harga & Realisasi Harga */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Estimasi Total Biaya (Rp)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    placeholder="Rp 0"
                    value={estimatedPrice}
                    onChange={e => setEstimatedPrice(Number(e.target.value) || '')}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900 focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Tempat / Toko / Pasar Belanja
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: Pasar Induk, Toko Plastik"
                    value={supplierLocation}
                    onChange={e => setSupplierLocation(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Catatan Tambahan */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Catatan Merek / Titipan Tambahan (Opsional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Contoh: Pilih merek Sania / Tropical, minta bon faktur dari toko."
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition"
                >
                  {editingItemId ? 'Simpan Perubahan' : 'Tambahkan ke Daftar Belanja'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7. Modal Catat ke Pengeluaran / Buku Kas Otomatis */}
      {expenseItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden border border-slate-200">
            <div className="p-4 bg-emerald-800 text-white flex justify-between items-center">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <CreditCard size={18} />
                <span>Bukukan ke Pengeluaran Kas</span>
              </h3>
              <button
                onClick={() => setExpenseItem(null)}
                className="text-emerald-200 hover:text-white p-1 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-200 text-xs text-emerald-950">
                <p className="font-bold text-sm">{expenseItem.name}</p>
                <p className="text-emerald-700 mt-0.5">Jumlah: {expenseItem.quantity} {expenseItem.unit}</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Nominal Realisasi Pengeluaran (Rp) *
                </label>
                <input
                  type="number"
                  min="0"
                  step="1000"
                  required
                  placeholder="Rp 0"
                  value={expenseActualAmount}
                  onChange={e => setExpenseActualAmount(Number(e.target.value) || '')}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-mono font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Metode Pembayaran
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setExpensePaymentMethod('TUNAI')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition ${
                      expensePaymentMethod === 'TUNAI'
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    💵 Kas Tunai
                  </button>
                  <button
                    type="button"
                    onClick={() => setExpensePaymentMethod('TRANSFER')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition ${
                      expensePaymentMethod === 'TRANSFER'
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    💳 Transfer Bank
                  </button>
                </div>
              </div>

              <div className="pt-2 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setExpenseItem(null)}
                  className="w-full py-2 px-3 border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-semibold"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleConfirmRecordExpense}
                  className="w-full py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition"
                >
                  Simpan ke Kas
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

