import React, { useState, useMemo } from 'react';
import { useRegisterModal } from '../context/ModalContext';
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
  History,
  Archive,
  RotateCcw,
  CalendarDays,
  ChevronDown,
  ChevronUp,
  Receipt,
  Clock,
} from 'lucide-react';
import * as XLSX from 'xlsx';

const SHOPPING_CATEGORIES = [
  'Semua Kategori',
  'Umum',
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
    inputShoppingItemActualPrice,
    archivePurchasedShoppingItems,
    restoreShoppingItemFromArchive,
    restoreShoppingSession,
    storeSettings,
    users,
  } = useWarung();

  // Navigation: Daftar Belanja Aktif vs Riwayat / History Belanja
  const [activeTab, setActiveTab] = useState<'ACTIVE' | 'HISTORY'>('ACTIVE');

  // Active / Working List Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Semua Kategori');
  const [selectedPriority, setSelectedPriority] = useState<'ALL' | ShoppingItemPriority>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'PURCHASED'>('ALL');
  const [realizeFilter, setRealizeFilter] = useState<'ALL' | 'WITH_REALIZATION' | 'WITHOUT_REALIZATION'>('ALL');
  const [marketChecklistMode, setMarketChecklistMode] = useState(false);
  const [copiedWa, setCopiedWa] = useState(false);

  // Quick Input Realisasi Modal State
  const [showRealizeModal, setShowRealizeModal] = useState(false);
  const parseRupiahInput = (val: string | number | undefined | null): number => {
    if (typeof val === 'number') return isNaN(val) ? 0 : val;
    if (!val) return 0;
    const clean = String(val).replace(/\D/g, '');
    return clean ? parseInt(clean, 10) : 0;
  };

  const [realizeItem, setRealizeItem] = useState<ShoppingItem | null>(null);
  const [realizePrice, setRealizePrice] = useState<number | string>('');
  const [realizeShoppingDate, setRealizeShoppingDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [realizePaymentMethod, setRealizePaymentMethod] = useState<'TUNAI' | 'TRANSFER'>('TUNAI');
  const [realizeNotes, setRealizeNotes] = useState('');

  // Batch / Single Save to History Modal State
  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [archiveBatchDate, setArchiveBatchDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [archiveSelectedIds, setArchiveSelectedIds] = useState<string[]>([]);
  const [archiveRecordToExpense, setArchiveRecordToExpense] = useState(false);
  const [archiveNotice, setArchiveNotice] = useState<string | null>(null);

  // Riwayat / History Belanja Filters & View States
  const [historyDateFilter, setHistoryDateFilter] = useState<'ALL' | 'TODAY' | '7_DAYS' | 'THIS_MONTH' | 'CUSTOM'>('ALL');
  const [historyCustomDate, setHistoryCustomDate] = useState('');
  const [historySearchQuery, setHistorySearchQuery] = useState('');
  const [historyCategoryFilter, setHistoryCategoryFilter] = useState('Semua Kategori');
  const [historyViewMode, setHistoryViewMode] = useState<'SESSION_CARDS' | 'TABLE'>('SESSION_CARDS');

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
  const [category, setCategory] = useState('Umum');
  const [quantity, setQuantity] = useState<number | ''>(1);
  const [unit, setUnit] = useState('kg');
  const [estimatedPrice, setEstimatedPrice] = useState<number | string>('');
  const [actualPrice, setActualPrice] = useState<number | string>('');
  const [priority, setPriority] = useState<ShoppingItemPriority>('NORMAL');
  const [supplierLocation, setSupplierLocation] = useState('');
  const [shoppingDate, setShoppingDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState('');

  // Record to Expense Confirmation Modal
  const [expenseItem, setExpenseItem] = useState<ShoppingItem | null>(null);
  const [expenseActualAmount, setExpenseActualAmount] = useState<number | string>('');
  const [expensePaymentMethod, setExpensePaymentMethod] = useState<'TUNAI' | 'TRANSFER'>('TUNAI');

  // Register all modals to back button and escape navigation
  useRegisterModal(showModal, () => setShowModal(false), 'shopping-add-edit-modal');
  useRegisterModal(showRealizeModal && Boolean(realizeItem), () => { setShowRealizeModal(false); setRealizeItem(null); }, 'shopping-realize-modal');
  useRegisterModal(showArchiveModal, () => setShowArchiveModal(false), 'shopping-archive-modal');
  useRegisterModal(showWhatsAppModal, () => setShowWhatsAppModal(false), 'shopping-whatsapp-modal');
  useRegisterModal(Boolean(expenseItem), () => setExpenseItem(null), 'shopping-expense-modal');

  // Data Separation: Active vs Archived
  const activeShoppingItems = useMemo(
    () => shoppingItems.filter(s => !s.isArchived),
    [shoppingItems]
  );
  const archivedShoppingItems = useMemo(
    () => shoppingItems.filter(s => s.isArchived === true),
    [shoppingItems]
  );

  // Active Filtered Items
  const filteredActiveItems = useMemo(() => {
    return activeShoppingItems.filter(item => {
      const matchSearch =
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.supplierLocation && item.supplierLocation.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (item.notes && item.notes.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (item.shoppingDate && item.shoppingDate.includes(searchQuery));

      const matchCat =
        selectedCategory === 'Semua Kategori' || item.category === selectedCategory;

      const matchPriority =
        selectedPriority === 'ALL' || item.priority === selectedPriority;

      const matchStatus =
        statusFilter === 'ALL' ||
        (statusFilter === 'PENDING' && item.status !== 'PURCHASED') ||
        (statusFilter === 'PURCHASED' && item.status === 'PURCHASED');

      const matchRealization =
        realizeFilter === 'ALL' ||
        (realizeFilter === 'WITH_REALIZATION' && item.actualPrice !== undefined && item.actualPrice !== null && item.actualPrice > 0) ||
        (realizeFilter === 'WITHOUT_REALIZATION' && (item.actualPrice === undefined || item.actualPrice === null || item.actualPrice === 0));

      return matchSearch && matchCat && matchPriority && matchStatus && matchRealization;
    });
  }, [activeShoppingItems, searchQuery, selectedCategory, selectedPriority, statusFilter, realizeFilter]);

  // Backward-compatible alias for existing views
  const filteredItems = filteredActiveItems;

  // Active Summary Metrics
  const pendingItems = activeShoppingItems.filter(s => s.status !== 'PURCHASED');
  const purchasedItems = activeShoppingItems.filter(s => s.status === 'PURCHASED');
  const urgentCount = activeShoppingItems.filter(s => s.status !== 'PURCHASED' && s.priority === 'URGENT').length;

  const totalEstimatedPendingBudget = pendingItems.reduce(
    (sum, item) => sum + (item.estimatedPrice || 0),
    0
  );
  const totalActualPurchasedSpend = purchasedItems.reduce(
    (sum, item) => sum + (item.actualPrice !== undefined && item.actualPrice !== null ? item.actualPrice : (item.estimatedPrice || 0)),
    0
  );

  // Realization specific statistics for Active
  const itemsWithActualPrice = activeShoppingItems.filter(
    s => s.actualPrice !== undefined && s.actualPrice !== null && s.actualPrice > 0
  );
  const totalActualRecorded = itemsWithActualPrice.reduce(
    (sum, s) => sum + (s.actualPrice || 0),
    0
  );
  const totalEstimatedForActualItems = itemsWithActualPrice.reduce(
    (sum, s) => sum + (s.estimatedPrice || 0),
    0
  );
  const totalRealizationVariance = totalActualRecorded - totalEstimatedForActualItems; // < 0 = Hemat, > 0 = Lebih

  // Filtered History Items
  const filteredHistoryItems = useMemo(() => {
    const todayStr = new Date().toISOString().slice(0, 10);
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const currentMonthPrefix = now.toISOString().slice(0, 7); // YYYY-MM

    return archivedShoppingItems.filter(item => {
      const itemDate = item.shoppingDate || (item.purchasedAt ? item.purchasedAt.slice(0, 10) : item.createdAt.slice(0, 10));

      // Date filter
      let matchDate = true;
      if (historyDateFilter === 'TODAY') {
        matchDate = itemDate === todayStr;
      } else if (historyDateFilter === '7_DAYS') {
        matchDate = itemDate >= sevenDaysAgo && itemDate <= todayStr;
      } else if (historyDateFilter === 'THIS_MONTH') {
        matchDate = itemDate.startsWith(currentMonthPrefix);
      } else if (historyDateFilter === 'CUSTOM' && historyCustomDate) {
        matchDate = itemDate === historyCustomDate;
      }

      // Search
      const q = historySearchQuery.trim().toLowerCase();
      const matchSearch =
        !q ||
        item.name.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q) ||
        (item.supplierLocation && item.supplierLocation.toLowerCase().includes(q)) ||
        (item.notes && item.notes.toLowerCase().includes(q)) ||
        itemDate.includes(q);

      // Category
      const matchCat =
        historyCategoryFilter === 'Semua Kategori' || item.category === historyCategoryFilter;

      return matchDate && matchSearch && matchCat;
    });
  }, [archivedShoppingItems, historyDateFilter, historyCustomDate, historySearchQuery, historyCategoryFilter]);

  // History Grouped by Sesi Belanja (Tanggal Belanja)
  const historySessions = useMemo(() => {
    const groups: { [date: string]: ShoppingItem[] } = {};
    filteredHistoryItems.forEach(item => {
      const dateKey = item.shoppingDate || (item.purchasedAt ? item.purchasedAt.slice(0, 10) : item.createdAt.slice(0, 10));
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(item);
    });
    return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]));
  }, [filteredHistoryItems]);

  // History Metrics
  const historyUniqueDatesCount = useMemo(() => {
    return new Set(archivedShoppingItems.map(s => s.shoppingDate || s.purchasedAt?.slice(0, 10) || s.createdAt.slice(0, 10))).size;
  }, [archivedShoppingItems]);

  const historyTotalSpend = useMemo(() => {
    return filteredHistoryItems.reduce((sum, item) => sum + (item.actualPrice || item.estimatedPrice || 0), 0);
  }, [filteredHistoryItems]);

  const historyTotalEstimated = useMemo(() => {
    return filteredHistoryItems.reduce((sum, item) => sum + (item.estimatedPrice || 0), 0);
  }, [filteredHistoryItems]);

  const historyTotalVariance = historyTotalSpend - historyTotalEstimated; // < 0 = hemat

  // Realization Handlers
  const handleOpenRealizeModal = (item: ShoppingItem, _defaultToEstimated?: boolean) => {
    setRealizeItem(item);
    // Nominal Default yang terisi sesuai estimasi anggaran
    const defaultPrice = (item.estimatedPrice && item.estimatedPrice > 0)
      ? item.estimatedPrice
      : (item.actualPrice !== undefined && item.actualPrice !== null && item.actualPrice > 0 ? item.actualPrice : '');
    setRealizePrice(defaultPrice);
    setRealizeShoppingDate(item.shoppingDate || new Date().toISOString().slice(0, 10));
    setRealizePaymentMethod('TUNAI');
    setRealizeNotes(item.notes || '');
    setShowRealizeModal(true);
  };

  const handleSaveRealization = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!realizeItem) return;

    // Nominal terisi otomatis sesuai estimasi anggaran jika belum ada input
    const actualAmount = realizePrice !== '' ? parseRupiahInput(realizePrice) : (realizeItem.estimatedPrice || 0);
    const dateToUse = realizeShoppingDate || new Date().toISOString().slice(0, 10);

    // Otomatisasi Terintegrasi Penuh:
    // 1. Status otomatis Selesai Dibeli (PURCHASED)
    // 2. Pencatatan otomatis ke Buku Kas Pengeluaran (Belanja Bahan Baku)
    // 3. Simpan otomatis ke Riwayat / History Belanja
    inputShoppingItemActualPrice(realizeItem.id, actualAmount, {
      markAsPurchased: true,
      recordToExpense: true,
      paymentMethod: realizePaymentMethod,
      shoppingDate: dateToUse,
      archiveToHistory: true,
    });

    if (realizeNotes !== (realizeItem.notes || '') || dateToUse !== realizeItem.shoppingDate) {
      updateShoppingItem(realizeItem.id, {
        notes: realizeNotes.trim() || undefined,
        shoppingDate: dateToUse,
      });
    }

    // Pastikan item langsung diarsipkan ke riwayat belanja
    archivePurchasedShoppingItems(dateToUse, [realizeItem.id]);

    setArchiveNotice(`✅ "${realizeItem.name}" berhasil direalisasikan (${formatRupiah(actualAmount)}), dicatat ke Buku Kas, & otomatis disimpan ke Riwayat!`);
    setTimeout(() => setArchiveNotice(null), 4000);

    setShowRealizeModal(false);
    setRealizeItem(null);
  };

  // Archive & History Handlers
  const handleOpenArchiveModal = (item?: ShoppingItem) => {
    if (item) {
      setArchiveSelectedIds([item.id]);
      setArchiveBatchDate(item.shoppingDate || new Date().toISOString().slice(0, 10));
    } else {
      const purchasedIds = purchasedItems.map(s => s.id);
      setArchiveSelectedIds(purchasedIds);
      const commonDate = purchasedItems.find(s => s.shoppingDate)?.shoppingDate || new Date().toISOString().slice(0, 10);
      setArchiveBatchDate(commonDate);
    }
    setArchiveRecordToExpense(false);
    setShowArchiveModal(true);
  };

  const handleConfirmArchive = () => {
    if (archiveSelectedIds.length === 0) return;

    // Optional: record unrecorded items to expenses
    if (archiveRecordToExpense) {
      archiveSelectedIds.forEach(id => {
        const it = shoppingItems.find(s => s.id === id);
        if (it && !it.isRecordedToExpense) {
          recordShoppingItemAsExpense(id, it.actualPrice || it.estimatedPrice, 'TUNAI');
        }
      });
    }

    const res = archivePurchasedShoppingItems(archiveBatchDate, archiveSelectedIds);
    setShowArchiveModal(false);
    setArchiveNotice(`✅ Berhasil menyimpan ${res.count} catatan barang ke History Belanja tanggal ${archiveBatchDate}!`);
    setTimeout(() => setArchiveNotice(null), 4000);
  };

  const handleArchiveSingleItem = (item: ShoppingItem) => {
    const itemDate = item.shoppingDate || new Date().toISOString().slice(0, 10);
    archivePurchasedShoppingItems(itemDate, [item.id]);
    setArchiveNotice(`✅ "${item.name}" berhasil disimpan ke History Belanja (Tanggal: ${itemDate})!`);
    setTimeout(() => setArchiveNotice(null), 3000);
  };

  const handleRestoreItem = (item: ShoppingItem) => {
    restoreShoppingItemFromArchive(item.id);
    setArchiveNotice(`🔄 "${item.name}" berhasil dikembalikan ke Daftar Belanja Aktif.`);
    setTimeout(() => setArchiveNotice(null), 3000);
  };

  const handleRestoreSession = (dateKey: string) => {
    if (window.confirm(`Kembalikan semua catatan belanja tanggal ${dateKey} ke Daftar Belanja Aktif?`)) {
      restoreShoppingSession(dateKey);
      setArchiveNotice(`🔄 Sesi belanja tanggal ${dateKey} berhasil dipulihkan ke Daftar Belanja Aktif.`);
      setTimeout(() => setArchiveNotice(null), 3000);
    }
  };

  const handleItemCheckboxClick = (item: ShoppingItem) => {
    if (item.status === 'PURCHASED') {
      toggleShoppingItemStatus(item.id, 'PENDING');
    } else {
      // If item does not have actual price yet, prompt for quick realization input!
      if (item.actualPrice === undefined || item.actualPrice === null) {
        handleOpenRealizeModal(item, true);
      } else {
        toggleShoppingItemStatus(item.id, 'PURCHASED');
      }
    }
  };

  // Form Handlers
  const handleOpenAddModal = () => {
    setEditingItemId(null);
    setName('');
    setCategory('Umum');
    setQuantity(1);
    setUnit('kg');
    setEstimatedPrice('');
    setActualPrice('');
    setPriority('NORMAL');
    setSupplierLocation('');
    setShoppingDate(new Date().toISOString().slice(0, 10));
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
    setShoppingDate(item.shoppingDate || (item.purchasedAt ? item.purchasedAt.slice(0, 10) : item.createdAt.slice(0, 10)));
    setNotes(item.notes || '');
    setShowModal(true);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const dateToUse = shoppingDate || new Date().toISOString().slice(0, 10);

    const estAmount = parseRupiahInput(estimatedPrice);
    const actAmount = actualPrice !== '' ? parseRupiahInput(actualPrice) : undefined;

    if (editingItemId) {
      updateShoppingItem(editingItemId, {
        name: name.trim(),
        category: category || 'Umum',
        quantity: Number(quantity) || 1,
        unit,
        estimatedPrice: estAmount,
        actualPrice: actAmount,
        priority,
        supplierLocation: supplierLocation.trim() || undefined,
        shoppingDate: dateToUse,
        notes: notes.trim() || undefined,
      });
    } else {
      addShoppingItem({
        name: name.trim(),
        category: category || 'Umum',
        quantity: Number(quantity) || 1,
        unit,
        estimatedPrice: estAmount,
        actualPrice: actAmount,
        priority,
        supplierLocation: supplierLocation.trim() || undefined,
        shoppingDate: dateToUse,
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
    const finalAmount = expenseActualAmount !== ''
      ? parseRupiahInput(expenseActualAmount)
      : (expenseItem.actualPrice || expenseItem.estimatedPrice || 0);
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
        const hasActual = item.actualPrice !== undefined && item.actualPrice !== null && item.actualPrice > 0;
        let priceText = '';
        if (waIncludePrice) {
          if (hasActual && item.estimatedPrice > 0) {
            const diff = (item.actualPrice || 0) - item.estimatedPrice;
            const diffTag = diff < 0 ? ` [Hemat ${formatRupiah(Math.abs(diff))}]` : diff > 0 ? ` [+${formatRupiah(diff)}]` : '';
            priceText = ` (~Est: ${formatRupiah(item.estimatedPrice)} ➔ *Realisasi: ${formatRupiah(item.actualPrice || 0)}*${diffTag})`;
          } else if (hasActual) {
            priceText = ` (*Realisasi: ${formatRupiah(item.actualPrice || 0)}*)`;
          } else if (item.estimatedPrice > 0) {
            priceText = ` (~${formatRupiah(item.estimatedPrice)})`;
          }
        }
        const locText = waIncludeLocation && item.supplierLocation ? ` 📍 _[${item.supplierLocation}]_` : '';
        const checkStatus = item.status === 'PURCHASED' ? '[✓]' : '[ ]';

        text += `${checkStatus} ${idx + 1}. *${item.name}* - ${item.quantity} ${item.unit}${priceText}${urgentTag}${locText}\n`;
        
        if (waIncludeNotes && item.notes) {
          text += `    _Ket: ${item.notes}_\n`;
        }
      });
    }

    text += `\n----------------------------------------\n`;
    if (waIncludePrice) {
      if (waTargetBudget > 0) {
        text += `💰 *Estimasi Total Anggaran : ${formatRupiah(waTargetBudget)}*\n`;
      }
      const actualInWa = waTargetItems.reduce((sum, item) => sum + (item.actualPrice || 0), 0);
      if (actualInWa > 0) {
        text += `💵 *Realisasi Belanja Bahan: ${formatRupiah(actualInWa)}*\n`;
      }
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

  // Export to Excel (Active list)
  const handleExportExcel = () => {
    const rows = activeShoppingItems.map((item, idx) => {
      const hasActual = item.actualPrice !== undefined && item.actualPrice !== null && item.actualPrice > 0;
      const diff = hasActual && item.estimatedPrice > 0 ? (item.actualPrice || 0) - item.estimatedPrice : null;
      const diffKet = diff === null ? '-' : diff < 0 ? `Hemat Rp ${Math.abs(diff).toLocaleString('id-ID')}` : diff > 0 ? `Lebih Rp ${diff.toLocaleString('id-ID')}` : 'Sesuai Estimasi';

      return {
        'No': idx + 1,
        'Tanggal Belanja': item.shoppingDate || formatDate(item.createdAt),
        'Nama Barang / Bahan': item.name,
        'Kategori': item.category,
        'Jumlah': item.quantity,
        'Satuan': item.unit,
        'Estimasi Harga (Rp)': item.estimatedPrice || 0,
        'Realisasi Beli (Rp)': hasActual ? item.actualPrice : (item.status === 'PURCHASED' ? item.estimatedPrice : '-'),
        'Selisih Anggaran': diffKet,
        'Prioritas': item.priority === 'URGENT' ? 'Mendesak (Habis)' : item.priority === 'HIGH' ? 'Penting' : item.priority === 'NORMAL' ? 'Normal' : 'Stok Tambahan',
        'Status': item.status === 'PURCHASED' ? 'Sudah Dibeli' : 'Belum Dibeli',
        'Tempat Belanja': item.supplierLocation || '-',
        'Dicatat ke Kas': item.isRecordedToExpense ? 'Ya (Buku Kas)' : 'Belum',
        'Catatan': item.notes || '-',
        'Tanggal Dibuat': formatDate(item.createdAt),
      };
    });

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Catatan Belanja Aktif');
    XLSX.writeFile(wb, `Catatan_Belanja_Aktif_${storeSettings.storeName}_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  // Export Riwayat / History to Excel
  const handleExportHistoryExcel = () => {
    const rows = filteredHistoryItems.map((item, idx) => {
      const itemDate = item.shoppingDate || (item.purchasedAt ? item.purchasedAt.slice(0, 10) : item.createdAt.slice(0, 10));
      const hasActual = item.actualPrice !== undefined && item.actualPrice !== null && item.actualPrice > 0;
      const diff = hasActual && item.estimatedPrice > 0 ? (item.actualPrice || 0) - item.estimatedPrice : null;
      const diffKet = diff === null ? '-' : diff < 0 ? `Hemat Rp ${Math.abs(diff).toLocaleString('id-ID')}` : diff > 0 ? `Lebih Rp ${diff.toLocaleString('id-ID')}` : 'Sesuai Estimasi';

      return {
        'No': idx + 1,
        'Tanggal Belanja': itemDate,
        'Nama Barang / Bahan': item.name,
        'Kategori': item.category,
        'Jumlah': item.quantity,
        'Satuan': item.unit,
        'Estimasi Anggaran (Rp)': item.estimatedPrice || 0,
        'Harga Realisasi Beli (Rp)': hasActual ? item.actualPrice : (item.estimatedPrice || 0),
        'Selisih vs Estimasi': diffKet,
        'Tempat / Toko Belanja': item.supplierLocation || '-',
        'Dicatat ke Buku Kas': item.isRecordedToExpense ? 'Sudah Tercatat' : 'Belum',
        'Pembeli / Kasir': item.purchasedBy || item.createdBy || '-',
        'Catatan': item.notes || '-',
      };
    });

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Riwayat Belanja');
    XLSX.writeFile(wb, `Riwayat_History_Belanja_${storeSettings.storeName}_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  // Send WhatsApp Recap for a specific History Session
  const handleSendSessionWhatsAppRecap = (dateKey: string, sessionItems: ShoppingItem[]) => {
    let text = `🛒 *REKAP RIWAYAT BELANJA BAHAN BAKU*\n`;
    text += `*${storeSettings.storeName}*\n`;
    text += `📅 *Tanggal Belanja : ${dateKey}*\n`;
    text += `----------------------------------------\n\n`;

    let sessionTotal = 0;
    let sessionEstTotal = 0;

    sessionItems.forEach((item, idx) => {
      const price = item.actualPrice || item.estimatedPrice || 0;
      sessionTotal += price;
      sessionEstTotal += (item.estimatedPrice || 0);

      text += `${idx + 1}. *${item.name}* (${item.quantity} ${item.unit})\n`;
      if (item.actualPrice) {
        text += `   • Realisasi: ${formatRupiah(item.actualPrice)}\n`;
        if (item.estimatedPrice > 0) {
          const d = item.actualPrice - item.estimatedPrice;
          if (d < 0) text += `   • _Hemat: ${formatRupiah(Math.abs(d))}_\n`;
          else if (d > 0) text += `   • _Lebih: +${formatRupiah(d)}_\n`;
        }
      }
      if (item.supplierLocation) {
        text += `   • Toko: ${item.supplierLocation}\n`;
      }
      if (item.notes) {
        text += `   • Catatan: ${item.notes}\n`;
      }
    });

    text += `\n----------------------------------------\n`;
    text += `💰 *Total Pengeluaran Realisasi: ${formatRupiah(sessionTotal)}*\n`;
    if (sessionEstTotal > 0) {
      text += `📊 Estimasi Awal: ${formatRupiah(sessionEstTotal)}\n`;
      const diff = sessionTotal - sessionEstTotal;
      if (diff < 0) {
        text += `📉 *Penghematan: ${formatRupiah(Math.abs(diff))}*\n`;
      } else if (diff > 0) {
        text += `📈 *Selisih Lebih: +${formatRupiah(diff)}*\n`;
      }
    }
    text += `📦 Total Barang: ${sessionItems.length} item\n`;
    text += `\n_Catatan riwayat belanja tersimpan rapi di sistem POS Warung._ 🙏`;

    openWhatsApp('', text);
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
      
      {/* Notice Banner */}
      {archiveNotice && (
        <div className="bg-emerald-600 text-white px-4 py-3 rounded-2xl shadow-md text-xs font-bold flex items-center justify-between animate-in slide-in-from-top duration-200">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} />
            <span>{archiveNotice}</span>
          </div>
          <button onClick={() => setArchiveNotice(null)} className="text-emerald-100 hover:text-white p-0.5">
            <X size={16} />
          </button>
        </div>
      )}

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
                {urgentCount > 0 && activeTab === 'ACTIVE' && (
                  <span className="text-[11px] font-bold bg-red-100 text-red-700 px-2 py-0.5 rounded-full animate-pulse border border-red-200">
                    🔴 {urgentCount} Bahan Habis!
                  </span>
                )}
              </h1>
              <p className="text-xs text-slate-500">
                Rencanakan belanja bahan baku warung, input realisasi nota beli, dan simpan riwayat belanja lengkap dengan tanggal belanja.
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            {activeTab === 'ACTIVE' ? (
              <>
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
                  <span>Kirim ke WA</span>
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

                {purchasedItems.length > 0 && (
                  <button
                    onClick={() => handleOpenArchiveModal()}
                    className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-2xs"
                    title="Simpan barang selesai dibeli ke history lengkap dengan tanggal belanja"
                  >
                    <Archive size={15} />
                    <span>Simpan ke History ({purchasedItems.length})</span>
                  </button>
                )}

                <button
                  id="shopping-export-excel-btn"
                  onClick={handleExportExcel}
                  className="px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-2xs"
                  title="Unduh Excel catatan belanja aktif"
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
              </>
            ) : (
              <>
                <button
                  onClick={handleExportHistoryExcel}
                  className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-2xs"
                  title="Unduh rekapan Excel seluruh riwayat belanja"
                >
                  <FileSpreadsheet size={15} className="text-emerald-400" />
                  <span>Export History Excel</span>
                </button>

                <button
                  onClick={() => { setActiveTab('ACTIVE'); handleOpenAddModal(); }}
                  className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-xs"
                >
                  <Plus size={16} />
                  <span>+ Belanja Baru</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Navigation Tabs: Daftar Belanja Aktif vs Riwayat / History Belanja */}
        <div className="flex items-center gap-2 border-t border-slate-100 pt-3">
          <button
            onClick={() => setActiveTab('ACTIVE')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer ${
              activeTab === 'ACTIVE'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <ShoppingBag size={15} />
            <span>Daftar Belanja Aktif</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
              activeTab === 'ACTIVE' ? 'bg-blue-700 text-white' : 'bg-slate-200 text-slate-800'
            }`}>
              {activeShoppingItems.length}
            </span>
            {pendingItems.length > 0 && (
              <span className="text-[10px] bg-amber-400 text-amber-950 font-bold px-1.5 py-0.2 rounded-full hidden sm:inline-block">
                {pendingItems.length} butuh dibeli
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('HISTORY')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer ${
              activeTab === 'HISTORY'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <History size={15} className={activeTab === 'HISTORY' ? 'text-amber-400' : 'text-slate-500'} />
            <span>Riwayat / History Belanja</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
              activeTab === 'HISTORY' ? 'bg-slate-800 text-amber-300' : 'bg-slate-200 text-slate-800'
            }`}>
              {archivedShoppingItems.length} item
            </span>
            {historyUniqueDatesCount > 0 && (
              <span className="hidden md:inline-block text-[10px] text-slate-400 font-medium">
                ({historyUniqueDatesCount} tanggal belanja)
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Save to History Suggestion Banner in Active Tab */}
      {activeTab === 'ACTIVE' && purchasedItems.length > 0 && (
        <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-blue-50 border-2 border-emerald-300 p-4 rounded-2xl shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <CheckCircle2 size={22} />
            </span>
            <div>
              <h3 className="text-xs sm:text-sm font-bold text-slate-900 flex items-center gap-2 flex-wrap">
                <span>{purchasedItems.length} Barang Sudah Selesai Dibeli</span>
                <span className="text-[10px] bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded-full font-bold">
                  Total Realisasi: {formatRupiah(totalActualPurchasedSpend)}
                </span>
              </h3>
              <p className="text-[11px] text-slate-600 mt-0.5">
                Simpan sesi ini ke Riwayat / History Belanja lengkap dengan tanggal belanja nota agar pembukuan rapi dan daftar belanja aktif bersih kembali.
              </p>
            </div>
          </div>
          <button
            onClick={() => handleOpenArchiveModal()}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition shrink-0 cursor-pointer"
          >
            <Archive size={16} />
            <span>Simpan ke History Belanja</span>
          </button>
        </div>
      )}

      {/* 2. DAFTAR BELANJA AKTIF VIEW */}
      {activeTab === 'ACTIVE' && (
        <div className="space-y-4">
          {/* KPI Summary Cards */}
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
          <span className="text-[11px] font-semibold text-slate-500 flex items-center justify-between">
            <span className="flex items-center gap-1">
              <ArrowDownCircle size={13} className="text-emerald-600" />
              <span>Realisasi Belanja Bahan</span>
            </span>
            {itemsWithActualPrice.length > 0 && (
              <span className="text-[9px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.2 rounded">
                {itemsWithActualPrice.length} Nota Riil
              </span>
            )}
          </span>
          <div className="mt-2">
            <div className="text-xl sm:text-2xl font-black text-slate-800">
              {formatRupiah(totalActualPurchasedSpend)}
            </div>
            <div className="text-[10px] mt-0.5">
              {itemsWithActualPrice.length > 0 && totalEstimatedForActualItems > 0 ? (
                totalRealizationVariance < 0 ? (
                  <span className="text-emerald-600 font-bold">
                    📉 Hemat {formatRupiah(Math.abs(totalRealizationVariance))} vs estimasi
                  </span>
                ) : totalRealizationVariance > 0 ? (
                  <span className="text-rose-600 font-bold">
                    📈 Lebih +{formatRupiah(totalRealizationVariance)} vs estimasi
                  </span>
                ) : (
                  <span className="text-blue-600 font-medium">Sesuai estimasi anggaran</span>
                )
              ) : (
                <span className="text-slate-400">Total belanja tersimpan</span>
              )}
            </div>
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
                Semua ({activeShoppingItems.length})
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

            {/* Realization Filter */}
            <select
              value={realizeFilter}
              onChange={e => setRealizeFilter(e.target.value as any)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-semibold focus:outline-none cursor-pointer"
            >
              <option value="ALL">Semua Realisasi ({activeShoppingItems.length})</option>
              <option value="WITH_REALIZATION">✅ Sudah Ada Realisasi ({itemsWithActualPrice.length})</option>
              <option value="WITHOUT_REALIZATION">⏳ Belum Ada Realisasi ({activeShoppingItems.length - itemsWithActualPrice.length})</option>
            </select>

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
              const hasActual = item.actualPrice !== undefined && item.actualPrice !== null && item.actualPrice > 0;

              return (
                <div
                  key={item.id}
                  onClick={() => handleItemCheckboxClick(item)}
                  className={`p-4 rounded-2xl border transition cursor-pointer flex items-center justify-between gap-3 select-none ${
                    isPurchased
                      ? 'bg-slate-100/80 border-slate-200 opacity-75'
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
                        {item.isRecordedToExpense && (
                          <span className="text-[9px] font-bold bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded-md">
                            Buku Kas
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-600 mt-0.5">
                        <span className="font-bold text-slate-900">{item.quantity} {item.unit}</span>
                        {item.estimatedPrice > 0 && (
                          <span className="text-slate-400 ml-2">~Est: {formatRupiah(item.estimatedPrice)}</span>
                        )}
                      </div>
                      
                      {/* Realization Badge in Market Mode */}
                      {hasActual ? (
                        <div className="text-xs text-emerald-700 font-bold flex items-center gap-1.5 mt-1">
                          <span>Realisasi: {formatRupiah(item.actualPrice || 0)}</span>
                          {item.estimatedPrice > 0 && (
                            <span className={`text-[10px] px-1.5 py-0.2 rounded font-semibold ${
                              (item.actualPrice || 0) < item.estimatedPrice
                                ? 'bg-emerald-100 text-emerald-800'
                                : (item.actualPrice || 0) > item.estimatedPrice
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-slate-200 text-slate-700'
                            }`}>
                              {(item.actualPrice || 0) < item.estimatedPrice
                                ? `Hemat ${formatRupiah(item.estimatedPrice - (item.actualPrice || 0))}`
                                : (item.actualPrice || 0) > item.estimatedPrice
                                ? `+${formatRupiah((item.actualPrice || 0) - item.estimatedPrice)}`
                                : 'Sesuai'}
                            </span>
                          )}
                        </div>
                      ) : isPurchased ? (
                        <div className="text-[10px] text-amber-700 font-semibold mt-1 flex items-center gap-1">
                          <span>⚠️ Belum input realisasi nota</span>
                        </div>
                      ) : null}

                      {item.supplierLocation && (
                        <div className="text-[11px] text-amber-800 flex items-center gap-1 mt-1">
                          <Store size={11} />
                          <span>{item.supplierLocation}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1.5 shrink-0" onClick={e => e.stopPropagation()}>
                    {/* Quick Realization Input Button */}
                    {hasActual ? (
                      <button
                        type="button"
                        onClick={() => handleOpenRealizeModal(item)}
                        className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-bold flex items-center gap-1 transition shadow-2xs"
                        title="Klik untuk ubah harga realisasi beli"
                      >
                        <span className="font-mono">{formatRupiah(item.actualPrice || 0)}</span>
                        <Edit2 size={11} className="text-emerald-600" />
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleOpenRealizeModal(item, true)}
                        className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[11px] font-bold flex items-center gap-1 transition shadow-2xs"
                        title="Input harga riil nota belanja pasar"
                      >
                        <DollarSign size={12} />
                        <span>Input Realisasi</span>
                      </button>
                    )}

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleSendSingleItemToWA(item)}
                        className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition"
                        title="Kirim item ini ke WhatsApp"
                      >
                        <MessageCircle size={15} />
                      </button>
                      {!item.isRecordedToExpense && (
                        <button
                          onClick={() => handleOpenRecordExpense(item)}
                          className="px-2 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg text-[10px] font-bold hover:bg-blue-100"
                        >
                          + Catat Kas
                        </button>
                      )}
                    </div>
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
                            onClick={() => handleItemCheckboxClick(item)}
                            className={`w-5 h-5 rounded-md flex items-center justify-center transition mx-auto ${
                              isPurchased
                                ? 'bg-emerald-600 text-white'
                                : 'border-2 border-slate-300 hover:border-blue-500'
                            }`}
                            title={isPurchased ? 'Klik untuk tandai belum dibeli' : 'Klik untuk tandai dibeli & input harga realisasi'}
                          >
                            {isPurchased && <Check size={14} />}
                          </button>
                        </td>

                        {/* Name & Notes */}
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900 flex items-center gap-1.5 flex-wrap">
                            <span className={isPurchased ? 'line-through text-slate-400' : ''}>
                              {item.name}
                            </span>
                            {item.isRecordedToExpense && (
                              <span className="text-[9px] font-bold bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded-md">
                                Tercatat di Kas
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-400 flex-wrap">
                            <span>📅 {formatDate(item.shoppingDate || item.purchasedAt || item.createdAt)}</span>
                            {item.notes && <span className="italic">• {item.notes}</span>}
                          </div>
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

                        {/* Actual Realization Price */}
                        <td className="py-3 px-3 text-right">
                          {item.actualPrice !== undefined && item.actualPrice !== null && item.actualPrice > 0 ? (
                            <button
                              type="button"
                              onClick={() => handleOpenRealizeModal(item)}
                              className="group text-right w-full cursor-pointer hover:bg-emerald-50/80 p-1 rounded-lg transition"
                              title="Klik untuk ubah harga realisasi nota beli"
                            >
                              <div className="font-mono font-bold text-xs text-emerald-700 flex items-center justify-end gap-1">
                                <span>{formatRupiah(item.actualPrice)}</span>
                                <Edit2 size={11} className="text-emerald-500 opacity-60 group-hover:opacity-100" />
                              </div>
                              {item.estimatedPrice > 0 && (
                                <div className="text-[10px] mt-0.5">
                                  {item.actualPrice < item.estimatedPrice ? (
                                    <span className="font-semibold text-emerald-600 bg-emerald-50 px-1 py-0.2 rounded border border-emerald-200">
                                      ↓ Hemat {formatRupiah(item.estimatedPrice - item.actualPrice)}
                                    </span>
                                  ) : item.actualPrice > item.estimatedPrice ? (
                                    <span className="font-semibold text-rose-600 bg-rose-50 px-1 py-0.2 rounded border border-rose-200">
                                      ↑ +{formatRupiah(item.actualPrice - item.estimatedPrice)}
                                    </span>
                                  ) : (
                                    <span className="text-slate-400">Pas Estimasi</span>
                                  )}
                                </div>
                              )}
                            </button>
                          ) : isPurchased ? (
                            <button
                              type="button"
                              onClick={() => handleOpenRealizeModal(item, true)}
                              className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 rounded-lg text-[10px] font-bold inline-flex items-center gap-1 transition shadow-2xs"
                              title="Barang sudah dibeli tapi belum isi harga riil nota. Klik untuk input harga realisasi."
                            >
                              <DollarSign size={11} className="text-amber-600" />
                              <span>Isi Realisasi</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleOpenRealizeModal(item, false)}
                              className="text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 px-2 py-1 rounded-lg text-[11px] font-medium transition inline-flex items-center gap-1"
                              title="Input harga realisasi beli sekarang"
                            >
                              <Plus size={11} />
                              <span>Input Realisasi</span>
                            </button>
                          )}
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
                            {/* Input / Edit Realization button */}
                            <button
                              onClick={() => handleOpenRealizeModal(item, !item.actualPrice)}
                              className="p-1.5 text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition"
                              title="Input / Edit Harga Realisasi Beli"
                            >
                              <DollarSign size={14} className="text-emerald-600" />
                            </button>

                            {/* Send to WA button */}
                            <button
                              onClick={() => handleSendSingleItemToWA(item)}
                              className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition"
                              title="Kirim item ini ke WhatsApp"
                            >
                              <MessageCircle size={14} />
                            </button>

                            {isPurchased && (
                              <button
                                onClick={() => handleArchiveSingleItem(item)}
                                className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition"
                                title="Simpan ke History Belanja (Arsipkan Lengkap Tanggal)"
                              >
                                <Archive size={14} className="text-emerald-600" />
                              </button>
                            )}

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
        </div>
      )}

      {/* 3. RIWAYAT / HISTORY BELANJA VIEW (Lengkap dengan Tanggal Belanja, Sesi, dan Rekap) */}
      {activeTab === 'HISTORY' && (
        <div className="space-y-4">
          {/* History KPI Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col justify-between">
              <span className="text-[11px] font-semibold text-slate-500 flex items-center gap-1.5">
                <Archive size={13} className="text-emerald-600" />
                <span>Total Barang Terarsip</span>
              </span>
              <div className="mt-2">
                <div className="text-xl sm:text-2xl font-black text-slate-900">
                  {filteredHistoryItems.length} <span className="text-xs font-medium text-slate-500">item</span>
                </div>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Dari total {archivedShoppingItems.length} riwayat belanja
                </p>
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col justify-between">
              <span className="text-[11px] font-semibold text-slate-500 flex items-center gap-1.5">
                <CalendarDays size={13} className="text-blue-600" />
                <span>Total Sesi / Tanggal Belanja</span>
              </span>
              <div className="mt-2">
                <div className="text-xl sm:text-2xl font-black text-blue-700">
                  {historySessions.length} <span className="text-xs font-medium text-slate-500">tanggal</span>
                </div>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Sesi belanja riwayat tersimpan
                </p>
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col justify-between">
              <span className="text-[11px] font-semibold text-slate-500 flex items-center gap-1.5">
                <DollarSign size={13} className="text-emerald-600" />
                <span>Total Realisasi Pengeluaran</span>
              </span>
              <div className="mt-2">
                <div className="text-xl sm:text-2xl font-black text-slate-900">
                  {formatRupiah(historyTotalSpend)}
                </div>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Total nota pembelian riil
                </p>
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col justify-between">
              <span className="text-[11px] font-semibold text-slate-500 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <ArrowDownCircle size={13} className="text-emerald-600" />
                  <span>Efisiensi Anggaran</span>
                </span>
              </span>
              <div className="mt-2">
                <div className="text-xl sm:text-2xl font-black">
                  {historyTotalVariance < 0 ? (
                    <span className="text-emerald-600">
                      📉 Hemat {formatRupiah(Math.abs(historyTotalVariance))}
                    </span>
                  ) : historyTotalVariance > 0 ? (
                    <span className="text-rose-600">
                      📈 Lebih +{formatRupiah(historyTotalVariance)}
                    </span>
                  ) : (
                    <span className="text-slate-700">Sesuai Estimasi</span>
                  )}
                </div>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Estimasi awal: {formatRupiah(historyTotalEstimated)}
                </p>
              </div>
            </div>
          </div>

          {/* History Search & Filter Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
            {/* Row 1: Date Presets & Custom Date Picker */}
            <div className="flex flex-wrap items-center justify-between gap-2.5">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-xs font-bold text-slate-600 flex items-center gap-1 mr-1">
                  <Calendar size={13} className="text-blue-600" />
                  <span>Filter Tanggal:</span>
                </span>
                <button
                  onClick={() => { setHistoryDateFilter('ALL'); setHistoryCustomDate(''); }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                    historyDateFilter === 'ALL'
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  Semua Tanggal
                </button>
                <button
                  onClick={() => { setHistoryDateFilter('TODAY'); setHistoryCustomDate(''); }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                    historyDateFilter === 'TODAY'
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  Hari Ini
                </button>
                <button
                  onClick={() => { setHistoryDateFilter('7_DAYS'); setHistoryCustomDate(''); }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                    historyDateFilter === '7_DAYS'
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  7 Hari Terakhir
                </button>
                <button
                  onClick={() => { setHistoryDateFilter('THIS_MONTH'); setHistoryCustomDate(''); }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                    historyDateFilter === 'THIS_MONTH'
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  Bulan Ini
                </button>
              </div>

              {/* Custom Date Picker & View Mode Toggle */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1 rounded-xl border border-slate-200">
                  <span className="text-[11px] text-slate-500 font-medium">Pilih Tanggal:</span>
                  <input
                    type="date"
                    value={historyCustomDate}
                    onChange={e => {
                      setHistoryCustomDate(e.target.value);
                      if (e.target.value) setHistoryDateFilter('CUSTOM');
                      else setHistoryDateFilter('ALL');
                    }}
                    className="text-xs font-bold text-slate-800 bg-transparent focus:outline-hidden"
                  />
                  {historyCustomDate && (
                    <button
                      onClick={() => { setHistoryCustomDate(''); setHistoryDateFilter('ALL'); }}
                      className="text-slate-400 hover:text-slate-600 p-0.5"
                    >
                      <X size={13} />
                    </button>
                  )}
                </div>

                <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200">
                  <button
                    onClick={() => setHistoryViewMode('SESSION_CARDS')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                      historyViewMode === 'SESSION_CARDS'
                        ? 'bg-white text-slate-900 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                    title="Tampilkan dikelompokkan per Sesi Tanggal Belanja"
                  >
                    <Layers size={13} />
                    <span>Per Tanggal</span>
                  </button>
                  <button
                    onClick={() => setHistoryViewMode('TABLE')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                      historyViewMode === 'TABLE'
                        ? 'bg-white text-slate-900 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                    title="Tampilkan dalam tabel lengkap"
                  >
                    <ClipboardList size={13} />
                    <span>Tabel Lengkap</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Row 2: Search Query & Category Filter */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1 border-t border-slate-100">
              <div className="sm:col-span-2 relative">
                <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari nama bahan, toko/pasar, catatan, atau tanggal belanja..."
                  value={historySearchQuery}
                  onChange={e => setHistorySearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>

              <div>
                <select
                  value={historyCategoryFilter}
                  onChange={e => setHistoryCategoryFilter(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 cursor-pointer"
                >
                  {SHOPPING_CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* History Content Display */}
          {filteredHistoryItems.length === 0 ? (
            <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center space-y-3">
              <div className="w-14 h-14 bg-slate-100 text-slate-500 rounded-2xl flex items-center justify-center mx-auto">
                <History size={28} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-800">Belum Ada Riwayat Belanja</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  {archivedShoppingItems.length === 0
                    ? 'Setelah barang belanjaan selesai dibeli, klik "Simpan ke History Belanja" untuk menyimpan riwayat belanja lengkap dengan tanggal belanja.'
                    : 'Tidak ada catatan belanja yang sesuai dengan filter atau tanggal yang dipilih.'}
                </p>
              </div>
              <div className="flex items-center justify-center gap-2">
                <button
                  onClick={() => setActiveTab('ACTIVE')}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs inline-flex items-center gap-1.5 transition cursor-pointer"
                >
                  <ShoppingBag size={15} />
                  <span>Buka Daftar Belanja Aktif</span>
                </button>
              </div>
            </div>
          ) : historyViewMode === 'SESSION_CARDS' ? (
            /* GROUPED BY TANGGAL BELANJA SESI */
            <div className="space-y-4">
              {historySessions.map(([dateKey, sessionItems]) => {
                const sessionActual = sessionItems.reduce((acc, s) => acc + (s.actualPrice || s.estimatedPrice || 0), 0);
                const sessionEstimated = sessionItems.reduce((acc, s) => acc + (s.estimatedPrice || 0), 0);
                const sessionVariance = sessionActual - sessionEstimated;
                const unrecordedCount = sessionItems.filter(s => !s.isRecordedToExpense).length;

                return (
                  <div key={dateKey} className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
                    {/* Session Header Card */}
                    <div className="p-4 bg-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <span className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-amber-400 shrink-0">
                          <CalendarDays size={20} />
                        </span>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-bold text-sm text-white">
                              {new Date(dateKey + 'T00:00:00').toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                            </h3>
                            <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full font-mono">
                              {sessionItems.length} item
                            </span>
                            {unrecordedCount === 0 ? (
                              <span className="text-[10px] bg-emerald-900/80 text-emerald-300 px-2 py-0.5 rounded-full font-semibold border border-emerald-700">
                                ✅ Masuk Buku Kas
                              </span>
                            ) : (
                              <span className="text-[10px] bg-amber-900/80 text-amber-300 px-2 py-0.5 rounded-full font-semibold border border-amber-700">
                                ⏳ {unrecordedCount} belum dicatat kas
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-300 mt-0.5">
                            Total Belanja: <strong className="text-emerald-400 font-mono text-sm">{formatRupiah(sessionActual)}</strong>
                            {sessionEstimated > 0 && (
                              <span className="ml-2 text-[11px] text-slate-400">
                                (Estimasi: {formatRupiah(sessionEstimated)}{' '}
                                {sessionVariance < 0 ? (
                                  <span className="text-emerald-300 font-bold">• Hemat {formatRupiah(Math.abs(sessionVariance))}</span>
                                ) : sessionVariance > 0 ? (
                                  <span className="text-rose-300 font-bold">• +{formatRupiah(sessionVariance)}</span>
                                ) : null})
                              </span>
                            )}
                          </p>
                        </div>
                      </div>

                      {/* Session Actions */}
                      <div className="flex items-center gap-2 self-end sm:self-center">
                        <button
                          onClick={() => handleSendSessionWhatsAppRecap(dateKey, sessionItems)}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-2xs cursor-pointer"
                          title="Kirim rekap belanja tanggal ini ke WhatsApp"
                        >
                          <MessageCircle size={14} />
                          <span>Kirim Rekap WA</span>
                        </button>

                        <button
                          onClick={() => handleRestoreSession(dateKey)}
                          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition border border-slate-700 cursor-pointer"
                          title="Kembalikan semua item tanggal ini ke Daftar Belanja Aktif"
                        >
                          <RotateCcw size={13} />
                          <span className="hidden sm:inline">Pulihkan Sesi</span>
                        </button>
                      </div>
                    </div>

                    {/* Items Table for this session */}
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200">
                          <tr>
                            <th className="py-2.5 px-4 w-10 text-center">No</th>
                            <th className="py-2.5 px-4">Nama Bahan / Barang</th>
                            <th className="py-2.5 px-3">Kategori</th>
                            <th className="py-2.5 px-3 text-right">Qty</th>
                            <th className="py-2.5 px-3 text-right">Estimasi</th>
                            <th className="py-2.5 px-3 text-right">Realisasi Beli</th>
                            <th className="py-2.5 px-3">Tempat / Toko</th>
                            <th className="py-2.5 px-3 text-center">Status Kas</th>
                            <th className="py-2.5 px-4 text-center">Aksi</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {sessionItems.map((item, idx) => {
                            const hasActual = item.actualPrice !== undefined && item.actualPrice !== null && item.actualPrice > 0;
                            const diff = hasActual && item.estimatedPrice > 0 ? (item.actualPrice || 0) - item.estimatedPrice : null;

                            return (
                              <tr key={item.id} className="hover:bg-slate-50/70 transition">
                                <td className="py-3 px-4 text-center text-slate-400 font-mono">
                                  {idx + 1}
                                </td>
                                <td className="py-3 px-4">
                                  <div className="font-bold text-slate-900">{item.name}</div>
                                  {item.notes && (
                                    <p className="text-[10px] text-slate-400 mt-0.5 italic">{item.notes}</p>
                                  )}
                                </td>
                                <td className="py-3 px-3">
                                  <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-semibold">
                                    {item.category}
                                  </span>
                                </td>
                                <td className="py-3 px-3 text-right">
                                  <span className="font-black text-sm text-slate-900">{item.quantity}</span>
                                  <span className="text-[10px] text-slate-400 ml-1 font-medium">{item.unit}</span>
                                </td>
                                <td className="py-3 px-3 text-right font-mono text-slate-500">
                                  {item.estimatedPrice > 0 ? formatRupiah(item.estimatedPrice) : '-'}
                                </td>
                                <td className="py-3 px-3 text-right">
                                  <span className="font-mono font-bold text-xs text-emerald-700">
                                    {formatRupiah(item.actualPrice || item.estimatedPrice || 0)}
                                  </span>
                                  {diff !== null && (
                                    <div className="text-[10px]">
                                      {diff < 0 ? (
                                        <span className="text-emerald-600 font-semibold">
                                          ↓ Hemat {formatRupiah(Math.abs(diff))}
                                        </span>
                                      ) : diff > 0 ? (
                                        <span className="text-rose-600 font-semibold">
                                          ↑ +{formatRupiah(diff)}
                                        </span>
                                      ) : (
                                        <span className="text-slate-400">Pas</span>
                                      )}
                                    </div>
                                  )}
                                </td>
                                <td className="py-3 px-3">
                                  {item.supplierLocation ? (
                                    <span className="text-[11px] text-slate-700 flex items-center gap-1">
                                      <Store size={12} className="text-amber-600 shrink-0" />
                                      <span>{item.supplierLocation}</span>
                                    </span>
                                  ) : (
                                    <span className="text-slate-300">-</span>
                                  )}
                                </td>
                                <td className="py-3 px-3 text-center">
                                  {item.isRecordedToExpense ? (
                                    <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full inline-block">
                                      ✅ Buku Kas
                                    </span>
                                  ) : (
                                    <button
                                      onClick={() => handleOpenRecordExpense(item)}
                                      className="px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-full text-[10px] font-bold hover:bg-blue-100 transition inline-block cursor-pointer"
                                    >
                                      + Masukkan Kas
                                    </button>
                                  )}
                                </td>
                                <td className="py-3 px-4 text-center">
                                  <div className="flex items-center justify-center gap-1">
                                    <button
                                      onClick={() => handleRestoreItem(item)}
                                      className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition cursor-pointer"
                                      title="Kembalikan item ini ke Daftar Belanja Aktif"
                                    >
                                      <RotateCcw size={14} />
                                    </button>
                                    <button
                                      onClick={() => deleteShoppingItem(item.id)}
                                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition cursor-pointer"
                                      title="Hapus permanen dari riwayat"
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* FLAT FULL TABLE VIEW */
            <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-900 text-white font-bold uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="py-3 px-4 w-10 text-center">No</th>
                      <th className="py-3 px-4">Tanggal Belanja</th>
                      <th className="py-3 px-4">Nama Bahan / Barang</th>
                      <th className="py-3 px-3">Kategori</th>
                      <th className="py-3 px-3 text-right">Jumlah / Qty</th>
                      <th className="py-3 px-3 text-right">Estimasi</th>
                      <th className="py-3 px-3 text-right">Realisasi Beli</th>
                      <th className="py-3 px-3">Tempat Belanja</th>
                      <th className="py-3 px-3 text-center">Status Kas</th>
                      <th className="py-3 px-4 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredHistoryItems.map((item, idx) => {
                      const itemDate = item.shoppingDate || (item.purchasedAt ? item.purchasedAt.slice(0, 10) : item.createdAt.slice(0, 10));
                      const hasActual = item.actualPrice !== undefined && item.actualPrice !== null && item.actualPrice > 0;
                      const diff = hasActual && item.estimatedPrice > 0 ? (item.actualPrice || 0) - item.estimatedPrice : null;

                      return (
                        <tr key={item.id} className="hover:bg-slate-50 transition">
                          <td className="py-3 px-4 text-center text-slate-400 font-mono">
                            {idx + 1}
                          </td>
                          <td className="py-3 px-4 font-mono font-bold text-slate-800 whitespace-nowrap">
                            📅 {itemDate}
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-bold text-slate-900">{item.name}</div>
                            {item.notes && (
                              <p className="text-[10px] text-slate-400 mt-0.5 italic">{item.notes}</p>
                            )}
                          </td>
                          <td className="py-3 px-3">
                            <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-semibold">
                              {item.category}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-right">
                            <span className="font-black text-sm text-slate-900">{item.quantity}</span>
                            <span className="text-[10px] text-slate-400 ml-1 font-medium">{item.unit}</span>
                          </td>
                          <td className="py-3 px-3 text-right font-mono text-slate-500">
                            {item.estimatedPrice > 0 ? formatRupiah(item.estimatedPrice) : '-'}
                          </td>
                          <td className="py-3 px-3 text-right">
                            <span className="font-mono font-bold text-xs text-emerald-700">
                              {formatRupiah(item.actualPrice || item.estimatedPrice || 0)}
                            </span>
                            {diff !== null && (
                              <div className="text-[10px]">
                                {diff < 0 ? (
                                  <span className="text-emerald-600 font-semibold">↓ Hemat {formatRupiah(Math.abs(diff))}</span>
                                ) : diff > 0 ? (
                                  <span className="text-rose-600 font-semibold">↑ +{formatRupiah(diff)}</span>
                                ) : null}
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-3">
                            {item.supplierLocation ? (
                              <span className="text-[11px] text-slate-700 flex items-center gap-1">
                                <Store size={12} className="text-amber-600 shrink-0" />
                                <span>{item.supplierLocation}</span>
                              </span>
                            ) : (
                              <span className="text-slate-300">-</span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-center">
                            {item.isRecordedToExpense ? (
                              <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full inline-block">
                                ✅ Tercatat
                              </span>
                            ) : (
                              <button
                                onClick={() => handleOpenRecordExpense(item)}
                                className="px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-full text-[10px] font-bold hover:bg-blue-100 transition inline-block cursor-pointer"
                              >
                                + Catat Kas
                              </button>
                            )}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => handleRestoreItem(item)}
                                className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition cursor-pointer"
                                title="Kembalikan ke Daftar Belanja Aktif"
                              >
                                <RotateCcw size={14} />
                              </button>
                              <button
                                onClick={() => deleteShoppingItem(item.id)}
                                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition cursor-pointer"
                                title="Hapus Permanen"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 5. MODAL KIRIM KE WHATSAPP (Lengkap dengan Pilihan Penerima, Filter, & Preview) */}
      {showWhatsAppModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 animate-in fade-in duration-150 cursor-pointer"
          onClick={() => setShowWhatsAppModal(false)}
        >
          <div
            className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full overflow-hidden border border-slate-200 flex flex-col max-h-[92vh] cursor-default"
            onClick={e => e.stopPropagation()}
          >
            
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
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150 cursor-pointer"
          onClick={() => setShowModal(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 cursor-default"
            onClick={e => e.stopPropagation()}
          >
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

              {/* Prioritas */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tingkat Kebutuhan / Prioritas
                </label>
                <select
                  value={priority}
                  onChange={e => setPriority(e.target.value as ShoppingItemPriority)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs text-slate-800 font-bold focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="URGENT">🔴 Mendesak (Habis!)</option>
                  <option value="HIGH">🟠 Prioritas Tinggi</option>
                  <option value="NORMAL">🔵 Normal</option>
                  <option value="LOW">⚪ Stok Tambahan</option>
                </select>
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
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <DollarSign size={14} className="text-emerald-600" />
                    <span>Anggaran & Realisasi Harga Belanja</span>
                  </span>
                  {Number(estimatedPrice) > 0 && Number(actualPrice) > 0 && (
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      Number(actualPrice) < Number(estimatedPrice)
                        ? 'bg-emerald-100 text-emerald-800'
                        : Number(actualPrice) > Number(estimatedPrice)
                        ? 'bg-rose-100 text-rose-800'
                        : 'bg-slate-200 text-slate-700'
                    }`}>
                      {Number(actualPrice) < Number(estimatedPrice)
                        ? `Hemat ${formatRupiah(Number(estimatedPrice) - Number(actualPrice))}`
                        : Number(actualPrice) > Number(estimatedPrice)
                        ? `Selisih Lebih ${formatRupiah(Number(actualPrice) - Number(estimatedPrice))}`
                        : 'Sesuai Estimasi'}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Estimasi Total Anggaran (Rp)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-xs">
                        Rp
                      </span>
                      <input
                        type="text"
                        inputMode="numeric"
                        placeholder="Contoh: 15.500"
                        value={estimatedPrice !== '' ? Number(estimatedPrice).toLocaleString('id-ID') : ''}
                        onChange={e => {
                          const clean = e.target.value.replace(/\D/g, '');
                          setEstimatedPrice(clean ? parseInt(clean, 10) : '');
                        }}
                        className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900 focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">Budget awal sebelum belanja (bisa nominal bebas)</p>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Harga Realisasi Beli (Rp)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-xs">
                        Rp
                      </span>
                      <input
                        type="text"
                        inputMode="numeric"
                        placeholder="Contoh: 15.500"
                        value={actualPrice !== '' ? Number(actualPrice).toLocaleString('id-ID') : ''}
                        onChange={e => {
                          const clean = e.target.value.replace(/\D/g, '');
                          setActualPrice(clean ? parseInt(clean, 10) : '');
                        }}
                        className="w-full pl-9 pr-3 py-2 bg-white border border-emerald-300 rounded-xl text-xs font-mono font-bold text-emerald-700 focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                    <p className="text-[10px] text-emerald-600 font-medium mt-1">Harga riil nota/struk belanja pasar</p>
                  </div>
                </div>
              </div>

              {/* Toko / Supplier */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tempat / Toko / Pasar Belanja
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Pasar Induk, Toko Plastik Jaya, Agen Sembako Makmur"
                  value={supplierLocation}
                  onChange={e => setSupplierLocation(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Tanggal Belanja */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                  <Calendar size={13} className="text-blue-600" />
                  <span>Tanggal Belanja / Rencana Belanja</span>
                </label>
                <input
                  type="date"
                  value={shoppingDate}
                  onChange={e => setShoppingDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Tanggal rencana belanja bahan atau tanggal nota belanja fisik.
                </p>
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
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150 cursor-pointer"
          onClick={() => setExpenseItem(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden border border-slate-200 cursor-default"
            onClick={e => e.stopPropagation()}
          >
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
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-xs">
                    Rp
                  </span>
                  <input
                    type="text"
                    inputMode="numeric"
                    required
                    placeholder="Contoh: 15.500"
                    value={expenseActualAmount !== '' ? Number(expenseActualAmount).toLocaleString('id-ID') : ''}
                    onChange={e => {
                      const clean = e.target.value.replace(/\D/g, '');
                      setExpenseActualAmount(clean ? parseInt(clean, 10) : '');
                    }}
                    className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-xl text-sm font-mono font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
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

      {/* 8. MODAL CEPAT INPUT HARGA REALISASI BELANJA BAHAN BAKU */}
      {showRealizeModal && realizeItem && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150 cursor-pointer"
          onClick={() => { setShowRealizeModal(false); setRealizeItem(null); }}
        >
          <div
            className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200 cursor-default"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-4 bg-emerald-800 text-white flex justify-between items-center">
              <div className="flex items-center gap-2.5">
                <span className="w-8 h-8 rounded-xl bg-emerald-700/80 flex items-center justify-center">
                  <DollarSign size={18} className="text-emerald-200" />
                </span>
                <div>
                  <h3 className="font-bold text-sm">Input Harga Realisasi Belanja</h3>
                  <p className="text-[11px] text-emerald-100">Catat harga aktual nota belanja bahan baku</p>
                </div>
              </div>
              <button
                onClick={() => { setShowRealizeModal(false); setRealizeItem(null); }}
                className="text-emerald-200 hover:text-white p-1 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveRealization} className="p-5 space-y-4">
              {/* Item Card Details */}
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">{realizeItem.category}</span>
                    <h4 className="text-sm font-bold text-slate-900">{realizeItem.name}</h4>
                  </div>
                  <span className="text-xs font-bold bg-white px-2.5 py-1 rounded-lg border border-slate-200 text-slate-800">
                    {realizeItem.quantity} {realizeItem.unit}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200/80 text-xs">
                  <div>
                    <span className="text-[11px] text-slate-500 block">Estimasi Anggaran:</span>
                    <span className="font-mono font-bold text-slate-700">
                      {realizeItem.estimatedPrice > 0 ? formatRupiah(realizeItem.estimatedPrice) : 'Tidak ada estimasi'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-500 block">Tempat Belanja:</span>
                    <span className="font-medium text-slate-800 truncate block">
                      {realizeItem.supplierLocation || 'Pasar / Toko Umum'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Input Realisasi Price */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Nominal Realisasi Harga Beli (Rp) *
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-sm">
                    Rp
                  </span>
                  <input
                    type="text"
                    inputMode="numeric"
                    required
                    autoFocus
                    placeholder={realizeItem.estimatedPrice > 0 ? Number(realizeItem.estimatedPrice).toLocaleString('id-ID') : '0'}
                    value={realizePrice !== '' ? Number(realizePrice).toLocaleString('id-ID') : ''}
                    onChange={e => {
                      const clean = e.target.value.replace(/\D/g, '');
                      setRealizePrice(clean ? parseInt(clean, 10) : '');
                    }}
                    className="w-full pl-11 pr-3 py-2.5 border-2 border-emerald-500 rounded-2xl text-base font-mono font-bold text-slate-900 focus:outline-hidden focus:ring-4 focus:ring-emerald-100"
                  />
                </div>
                {realizePrice !== '' && Number(realizePrice) > 0 && (
                  <p className="text-[11px] text-emerald-700 font-semibold mt-1 font-mono">
                    {formatRupiah(Number(realizePrice))}
                  </p>
                )}
              </div>

              {/* Variance / Comparison Display */}
              {realizePrice !== '' && realizeItem.estimatedPrice > 0 && (
                <div className={`p-3 rounded-xl border text-xs ${
                  Number(realizePrice) < realizeItem.estimatedPrice
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                    : Number(realizePrice) > realizeItem.estimatedPrice
                    ? 'bg-amber-50 border-amber-200 text-amber-900'
                    : 'bg-blue-50 border-blue-200 text-blue-900'
                }`}>
                  {Number(realizePrice) < realizeItem.estimatedPrice ? (
                    <div className="flex items-center gap-2">
                      <span className="text-base">🎉</span>
                      <div>
                        <strong>Lebih Hemat {formatRupiah(realizeItem.estimatedPrice - Number(realizePrice))}</strong> ({Math.round(((realizeItem.estimatedPrice - Number(realizePrice)) / realizeItem.estimatedPrice) * 100)}%) dibanding estimasi anggaran.
                      </div>
                    </div>
                  ) : Number(realizePrice) > realizeItem.estimatedPrice ? (
                    <div className="flex items-center gap-2">
                      <span className="text-base">⚠️</span>
                      <div>
                        <strong>Lebih Mahal {formatRupiah(Number(realizePrice) - realizeItem.estimatedPrice)}</strong> (+{Math.round(((Number(realizePrice) - realizeItem.estimatedPrice) / realizeItem.estimatedPrice) * 100)}%) dibanding estimasi anggaran.
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="text-base">✓</span>
                      <div>Harga pas sesuai estimasi anggaran ({formatRupiah(realizeItem.estimatedPrice)}).</div>
                    </div>
                  )}
                </div>
              )}

              {/* Tanggal Belanja Realisasi */}
              <div className="bg-emerald-50/70 p-3 rounded-2xl border border-emerald-200 space-y-1">
                <label className="block text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                  <Calendar size={13} className="text-emerald-700" />
                  <span>Tanggal Belanja / Tanggal Nota Beli *</span>
                </label>
                <input
                  type="date"
                  required
                  value={realizeShoppingDate}
                  onChange={e => setRealizeShoppingDate(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-emerald-300 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                />
              </div>

              {/* Otomatisasi Terintegrasi Penuh: Status Selesai Dibeli, Pencatatan Buku Kas, & Simpan ke Riwayat */}
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3.5 space-y-2.5">
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-900">
                  <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                  <span>Otomatisasi Sekali Simpan:</span>
                </div>
                <div className="grid grid-cols-1 gap-1.5 text-[11px] text-emerald-800 font-medium pl-1">
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                    <span>Status otomatis <strong>Selesai Dibeli (PURCHASED)</strong></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                    <span>Otomatis dibukukan ke <strong>Buku Kas Pengeluaran (Belanja Bahan)</strong></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                    <span>Otomatis disimpan ke <strong>Riwayat Belanja</strong></span>
                  </div>
                </div>

                {/* Pilihan Metode Pembayaran Kas */}
                <div className="pt-2 border-t border-emerald-200/80">
                  <span className="text-[11px] text-emerald-900 font-semibold block mb-1.5">Metode Pembayaran Buku Kas:</span>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setRealizePaymentMethod('TUNAI')}
                      className={`py-1.5 px-3 rounded-xl border text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1.5 ${
                        realizePaymentMethod === 'TUNAI'
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                          : 'bg-white border-emerald-200 text-slate-700 hover:bg-emerald-100/50'
                      }`}
                    >
                      💵 Kas Tunai
                    </button>
                    <button
                      type="button"
                      onClick={() => setRealizePaymentMethod('TRANSFER')}
                      className={`py-1.5 px-3 rounded-xl border text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1.5 ${
                        realizePaymentMethod === 'TRANSFER'
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                          : 'bg-white border-emerald-200 text-slate-700 hover:bg-emerald-100/50'
                      }`}
                    >
                      💳 Transfer Bank
                    </button>
                  </div>
                </div>
              </div>

              {/* Modal Action Buttons */}
              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => { setShowRealizeModal(false); setRealizeItem(null); }}
                  className="px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Check size={15} />
                  <span>Simpan Realisasi</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 9. MODAL SIMPAN RIWAYAT / HISTORY BELANJA DILENGKAPI TANGGAL BELANJA */}
      {showArchiveModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 animate-in fade-in duration-150 cursor-pointer"
          onClick={() => setShowArchiveModal(false)}
        >
          <div
            className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 flex flex-col max-h-[90vh] cursor-default"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-4 bg-emerald-800 text-white flex justify-between items-center shrink-0">
              <div className="flex items-center gap-2.5">
                <span className="w-8 h-8 rounded-xl bg-emerald-700/80 flex items-center justify-center">
                  <Archive size={18} className="text-emerald-200" />
                </span>
                <div>
                  <h3 className="font-bold text-sm">Simpan ke History Belanja</h3>
                  <p className="text-[11px] text-emerald-100">Arsipkan belanja selesai lengkap dengan tanggal belanja</p>
                </div>
              </div>
              <button
                onClick={() => setShowArchiveModal(false)}
                className="text-emerald-200 hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto flex-1">
              {/* Tanggal Belanja Picker */}
              <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-200 space-y-2">
                <label className="block text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                  <CalendarDays size={16} className="text-emerald-700" />
                  <span>Tanggal Belanja / Tanggal Nota Beli *</span>
                </label>
                <input
                  type="date"
                  required
                  value={archiveBatchDate}
                  onChange={e => setArchiveBatchDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-emerald-300 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                />
                <p className="text-[10px] text-emerald-700">
                  Tanggal ini disimpan sebagai tanggal belanja riil untuk sesi riwayat belanja ini.
                </p>
              </div>

              {/* Items Preview & Selection */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-800">
                    Pilih Barang yang Disimpan ke Riwayat ({archiveSelectedIds.length} dipilih):
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const allPurchasedIds = purchasedItems.map(s => s.id);
                      if (archiveSelectedIds.length === allPurchasedIds.length) {
                        setArchiveSelectedIds([]);
                      } else {
                        setArchiveSelectedIds(allPurchasedIds);
                      }
                    }}
                    className="text-[11px] text-emerald-700 font-bold hover:underline cursor-pointer"
                  >
                    {archiveSelectedIds.length === purchasedItems.length ? 'Batal Pilih Semua' : 'Pilih Semua'}
                  </button>
                </div>

                <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-2xl p-2 bg-slate-50 divide-y divide-slate-100">
                  {purchasedItems.map(item => {
                    const isChecked = archiveSelectedIds.includes(item.id);
                    const price = item.actualPrice || item.estimatedPrice || 0;

                    return (
                      <label
                        key={item.id}
                        className="flex items-center gap-2.5 p-2 hover:bg-white rounded-xl cursor-pointer text-xs transition"
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {
                            if (isChecked) {
                              setArchiveSelectedIds(archiveSelectedIds.filter(id => id !== item.id));
                            } else {
                              setArchiveSelectedIds([...archiveSelectedIds, item.id]);
                            }
                          }}
                          className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                        />
                        <div className="flex-1 min-w-0">
                          <span className="font-bold text-slate-900 block truncate">{item.name}</span>
                          <span className="text-[10px] text-slate-500">
                            {item.quantity} {item.unit} • {item.supplierLocation || 'Toko/Pasar'}
                          </span>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="font-mono font-bold text-emerald-700 block text-xs">
                            {formatRupiah(price)}
                          </span>
                          {item.actualPrice ? (
                            <span className="text-[9px] text-emerald-600 bg-emerald-50 px-1 py-0.2 rounded border border-emerald-200">
                              Riil
                            </span>
                          ) : (
                            <span className="text-[9px] text-slate-400">Estimasi</span>
                          )}
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Automatic Cash Book Record Option */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <label className="flex items-start gap-2.5 text-xs text-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={archiveRecordToExpense}
                    onChange={e => setArchiveRecordToExpense(e.target.checked)}
                    className="rounded text-emerald-600 focus:ring-emerald-500 mt-0.5 cursor-pointer"
                  />
                  <div>
                    <span className="font-semibold block">Catat otomatis ke Buku Kas (Beban Pengeluaran)</span>
                    <span className="text-[10px] text-slate-500 block">
                      Barang yang belum dibukukan akan otomatis dimasukkan ke kas dengan tanggal {archiveBatchDate}.
                    </span>
                  </div>
                </label>
              </div>

              {/* Total Summary */}
              <div className="p-3.5 bg-slate-900 text-white rounded-2xl flex items-center justify-between text-xs">
                <div>
                  <span className="text-slate-400 text-[10px] block">Total Realisasi Belanja:</span>
                  <span className="font-mono font-bold text-base text-emerald-400">
                    {formatRupiah(
                      purchasedItems
                        .filter(s => archiveSelectedIds.includes(s.id))
                        .reduce((sum, s) => sum + (s.actualPrice || s.estimatedPrice || 0), 0)
                    )}
                  </span>
                </div>
                <span className="text-[11px] bg-slate-800 text-slate-300 px-2.5 py-1 rounded-xl">
                  {archiveSelectedIds.length} item akan diarsipkan
                </span>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex items-center justify-end gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowArchiveModal(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={archiveSelectedIds.length === 0}
                  onClick={handleConfirmArchive}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Archive size={15} />
                  <span>Simpan ke History Belanja ({archiveSelectedIds.length})</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

