import React, { useState, useMemo } from 'react';
import { useWarung } from '../context/WarungContext';
import {
  Product,
  CartItem,
  Customer,
  PaymentMethod,
  DiscountType,
  ProductVariant,
  Transaction,
} from '../types';
import { formatRupiah, formatDateOnly } from '../utils/format';
import {
  X,
  Calendar,
  Clock,
  User,
  ShoppingBag,
  Plus,
  Minus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Percent,
  DollarSign,
  Search,
  Check,
  CreditCard,
  History,
  Sparkles,
} from 'lucide-react';

interface RetroactiveSaleModalProps {
  onClose: () => void;
  onSuccess?: (transaction: Transaction) => void;
}

export const RetroactiveSaleModal: React.FC<RetroactiveSaleModalProps> = ({
  onClose,
  onSuccess,
}) => {
  const {
    products,
    customers,
    currentUser,
    storeSettings,
    addRetroactiveTransaction,
  } = useWarung();

  // 1. Date & Time Selection
  const getYesterdayISOString = () => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    d.setHours(12, 0, 0, 0);
    // Format YYYY-MM-DDTHH:mm
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  const getDaysAgoISOString = (daysAgo: number) => {
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    d.setHours(12, 0, 0, 0);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  const [dateTimeInput, setDateTimeInput] = useState<string>(getYesterdayISOString());
  const [selectedQuickDay, setSelectedQuickDay] = useState<number>(1); // 1 = Kemarin, 2 = 2 Hari Lalu, 3 = 3 Hari Lalu, 0 = Custom

  const handleQuickDaySelect = (daysAgo: number) => {
    setSelectedQuickDay(daysAgo);
    if (daysAgo > 0) {
      setDateTimeInput(getDaysAgoISOString(daysAgo));
    }
  };

  // 2. Customer
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);

  const selectedCustomer = useMemo(() => {
    return customers.find(c => c.id === selectedCustomerId) || null;
  }, [customers, selectedCustomerId]);

  const filteredCustomers = useMemo(() => {
    if (!customerSearch.trim()) return customers.slice(0, 8);
    const q = customerSearch.toLowerCase();
    return customers.filter(
      c =>
        c.name.toLowerCase().includes(q) ||
        (c.phone && c.phone.includes(q)) ||
        (c.storeName && c.storeName.toLowerCase().includes(q))
    );
  }, [customers, customerSearch]);

  // 3. Cashier
  const [cashierName, setCashierName] = useState<string>(
    currentUser?.name || storeSettings.cashierName || 'Admin'
  );

  // 4. Cart Items
  const [items, setItems] = useState<CartItem[]>([]);
  const [productSearch, setProductSearch] = useState('');
  const [selectedProductToAdd, setSelectedProductToAdd] = useState<Product | null>(null);
  const [productVariantSelections, setProductVariantSelections] = useState<ProductVariant[]>([]);
  const [addQty, setAddQty] = useState<number>(1);

  // Filter available products
  const filteredProducts = useMemo(() => {
    const active = products.filter(p => !p.isArchived);
    if (!productSearch.trim()) return active.slice(0, 10);
    const q = productSearch.toLowerCase();
    return active.filter(
      p =>
        p.name.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        (p.barcode && p.barcode.includes(q))
    );
  }, [products, productSearch]);

  // Add Item to cart
  const handleAddItem = (prod: Product) => {
    if (prod.variants && prod.variants.length > 0) {
      setSelectedProductToAdd(prod);
      setProductVariantSelections([prod.variants[0]]);
      setAddQty(1);
      return;
    }

    // Direct add
    const priceAdjustment = 0;
    const costAdjustment = 0;
    const finalPrice = Math.max(0, prod.basePrice + priceAdjustment);
    const finalCost = Math.max(0, prod.baseCost + costAdjustment);

    setItems(prev => {
      const existingIdx = prev.findIndex(
        i => i.productId === prod.id && i.selectedVariants.length === 0
      );
      if (existingIdx > -1) {
        const next = [...prev];
        const newQty = next[existingIdx].quantity + 1;
        next[existingIdx] = {
          ...next[existingIdx],
          quantity: newQty,
          subtotal: newQty * next[existingIdx].finalPricePerUnit,
          subtotalCost: newQty * next[existingIdx].finalCostPerUnit,
        };
        return next;
      } else {
        const newItem: CartItem = {
          id: 'item-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
          productId: prod.id,
          productName: prod.name,
          basePrice: prod.basePrice,
          baseCost: prod.baseCost,
          selectedVariants: [],
          finalPricePerUnit: finalPrice,
          finalCostPerUnit: finalCost,
          quantity: 1,
          subtotal: finalPrice * 1,
          subtotalCost: finalCost * 1,
        };
        return [...prev, newItem];
      }
    });
  };

  const handleConfirmVariantAdd = () => {
    if (!selectedProductToAdd) return;
    const priceAdj = productVariantSelections.reduce((s, v) => s + (v.priceAdjustment || 0), 0);
    const costAdj = productVariantSelections.reduce((s, v) => s + (v.costAdjustment || 0), 0);
    const finalPrice = Math.max(0, selectedProductToAdd.basePrice + priceAdj);
    const finalCost = Math.max(0, selectedProductToAdd.baseCost + costAdj);

    const variantKey = productVariantSelections.map(v => v.id).sort().join('-');

    setItems(prev => {
      const existingIdx = prev.findIndex(
        i =>
          i.productId === selectedProductToAdd.id &&
          i.selectedVariants.map(v => v.id).sort().join('-') === variantKey
      );
      if (existingIdx > -1) {
        const next = [...prev];
        const newQty = next[existingIdx].quantity + addQty;
        next[existingIdx] = {
          ...next[existingIdx],
          quantity: newQty,
          subtotal: newQty * next[existingIdx].finalPricePerUnit,
          subtotalCost: newQty * next[existingIdx].finalCostPerUnit,
        };
        return next;
      } else {
        const newItem: CartItem = {
          id: 'item-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
          productId: selectedProductToAdd.id,
          productName: selectedProductToAdd.name,
          basePrice: selectedProductToAdd.basePrice,
          baseCost: selectedProductToAdd.baseCost,
          selectedVariants: [...productVariantSelections],
          finalPricePerUnit: finalPrice,
          finalCostPerUnit: finalCost,
          quantity: addQty,
          subtotal: finalPrice * addQty,
          subtotalCost: finalCost * addQty,
        };
        return [...prev, newItem];
      }
    });

    setSelectedProductToAdd(null);
    setProductVariantSelections([]);
    setAddQty(1);
  };

  const handleUpdateItemQty = (itemId: string, newQty: number) => {
    if (newQty <= 0) {
      setItems(prev => prev.filter(i => i.id !== itemId));
    } else {
      setItems(prev =>
        prev.map(i => {
          if (i.id === itemId) {
            return {
              ...i,
              quantity: newQty,
              subtotal: newQty * i.finalPricePerUnit - (i.discountAmount || 0),
              subtotalCost: newQty * i.finalCostPerUnit,
            };
          }
          return i;
        })
      );
    }
  };

  const handleRemoveItem = (itemId: string) => {
    setItems(prev => prev.filter(i => i.id !== itemId));
  };

  // 5. Discount & Tax
  const [discountType, setDiscountType] = useState<DiscountType>('NOMINAL');
  const [discountInput, setDiscountInput] = useState<number>(0);
  const [enableTax, setEnableTax] = useState<boolean>(storeSettings.enableTax || false);

  const subtotal = useMemo(() => {
    return items.reduce((sum, item) => sum + item.subtotal, 0);
  }, [items]);

  const totalCost = useMemo(() => {
    return items.reduce((sum, item) => sum + item.subtotalCost, 0);
  }, [items]);

  const calculatedDiscount = useMemo(() => {
    if (discountType === 'PERCENTAGE') {
      return Math.round((subtotal * Math.min(100, Math.max(0, discountInput))) / 100);
    }
    return Math.min(subtotal, Math.max(0, discountInput));
  }, [subtotal, discountType, discountInput]);

  const calculatedTax = useMemo(() => {
    if (!enableTax) return 0;
    return Math.round(((subtotal - calculatedDiscount) * (storeSettings.taxRate || 11)) / 100);
  }, [enableTax, subtotal, calculatedDiscount, storeSettings.taxRate]);

  const finalAmount = Math.max(0, subtotal - calculatedDiscount + calculatedTax);
  const grossProfit = finalAmount - totalCost;

  // 6. Payment Method & Details
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('TUNAI');
  const [cashGiven, setCashGiven] = useState<number>(0);
  const [adjustStock, setAdjustStock] = useState<boolean>(true);
  const [customInvoiceNumber, setCustomInvoiceNumber] = useState<string>('');
  const [notes, setNotes] = useState<string>('Penjualan susulan kemarin');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (items.length === 0) {
      setErrorMsg('Harap pilih minimal 1 item menu yang terjual.');
      return;
    }

    if (!dateTimeInput) {
      setErrorMsg('Harap pilih tanggal dan waktu penjualan yang valid.');
      return;
    }

    const isoDate = new Date(dateTimeInput).toISOString();

    setIsSubmitting(true);
    try {
      const res = addRetroactiveTransaction({
        timestamp: isoDate,
        items,
        paymentMethod,
        discountAmount: calculatedDiscount,
        discountType,
        discountRate: discountInput,
        tax: calculatedTax,
        cashGiven: paymentMethod === 'TUNAI' ? (cashGiven || finalAmount) : finalAmount,
        selectedCustomer,
        notes: notes.trim(),
        cashierName: cashierName.trim() || 'Admin',
        adjustStock,
        invoiceNumber: customInvoiceNumber.trim() || undefined,
      });

      if (res.success && res.transaction) {
        if (onSuccess) onSuccess(res.transaction);
        onClose();
      } else {
        setErrorMsg(res.message || 'Gagal menyimpan transaksi susulan.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Terjadi kesalahan sistem saat menyimpan.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full my-auto overflow-hidden border border-slate-200 flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="p-4 bg-gradient-to-r from-teal-900 via-slate-900 to-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-teal-500/20 text-teal-300 border border-teal-500/30 flex items-center justify-center font-bold text-lg">
              <History size={20} />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base flex items-center gap-2">
                Input Penjualan Susulan (Kemarin / Lampau)
              </h3>
              <p className="text-[11px] text-teal-200/80">
                Catat transaksi penjualan yang terlewat agar pembukuan & laporan laba rugi akurat
              </p>
            </div>
          </div>
          <button
            id="close-retroactive-modal-btn"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
          
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 flex items-center gap-2">
              <AlertCircle size={16} className="shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* SECTION 1: TANGGAL & WAKTU TRANSAKSI */}
          <div className="bg-teal-50/50 p-3.5 rounded-xl border border-teal-200/70 space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="font-bold text-slate-800 flex items-center gap-1.5">
                <Calendar size={14} className="text-teal-700" />
                <span>Pilih Tanggal & Jam Penjualan (Kemarin / Lampau)</span>
              </label>
              <span className="text-[10px] text-teal-700 font-semibold bg-teal-100/70 px-2 py-0.5 rounded-md">
                Wajib Sesuai Waktu Asli
              </span>
            </div>

            {/* Quick Day Selector Buttons */}
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                id="quick-day-yesterday"
                onClick={() => handleQuickDaySelect(1)}
                className={`px-3 py-1.5 rounded-lg font-semibold text-xs transition border flex items-center gap-1 ${
                  selectedQuickDay === 1
                    ? 'bg-teal-700 text-white border-teal-700 shadow-xs'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <span>📅 Kemarin (H-1)</span>
              </button>

              <button
                type="button"
                id="quick-day-2days"
                onClick={() => handleQuickDaySelect(2)}
                className={`px-3 py-1.5 rounded-lg font-semibold text-xs transition border flex items-center gap-1 ${
                  selectedQuickDay === 2
                    ? 'bg-teal-700 text-white border-teal-700 shadow-xs'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <span>📅 2 Hari Lalu</span>
              </button>

              <button
                type="button"
                id="quick-day-3days"
                onClick={() => handleQuickDaySelect(3)}
                className={`px-3 py-1.5 rounded-lg font-semibold text-xs transition border flex items-center gap-1 ${
                  selectedQuickDay === 3
                    ? 'bg-teal-700 text-white border-teal-700 shadow-xs'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <span>📅 3 Hari Lalu</span>
              </button>

              <button
                type="button"
                id="quick-day-custom"
                onClick={() => setSelectedQuickDay(0)}
                className={`px-3 py-1.5 rounded-lg font-semibold text-xs transition border flex items-center gap-1 ${
                  selectedQuickDay === 0
                    ? 'bg-teal-700 text-white border-teal-700 shadow-xs'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <span>⚙️ Pilih Tanggal Lain</span>
              </button>
            </div>

            {/* DateTime input */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <span className="text-[11px] text-slate-600 block mb-1 font-medium">
                  Atur Tanggal & Jam Spesifik:
                </span>
                <input
                  id="retro-datetime-input"
                  type="datetime-local"
                  value={dateTimeInput}
                  onChange={e => {
                    setDateTimeInput(e.target.value);
                    setSelectedQuickDay(0);
                  }}
                  className="w-full px-3 py-2 bg-white border border-teal-300 rounded-xl text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <span className="text-[11px] text-slate-600 block mb-1 font-medium">
                  Petugas Kasir / Admin Input:
                </span>
                <input
                  id="retro-cashier-input"
                  type="text"
                  placeholder="Nama Kasir / Admin"
                  value={cashierName}
                  onChange={e => setCashierName(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-teal-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* SECTION 2: PELANGGAN & DETAIL PEMESAN */}
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
            <label className="font-bold text-slate-800 flex items-center gap-1.5">
              <User size={14} className="text-slate-600" />
              <span>Pelanggan (Opsional / Umum)</span>
            </label>

            <div className="relative">
              <div className="flex gap-2">
                <input
                  id="retro-cust-search"
                  type="text"
                  placeholder="Ketik nama pelanggan / no HP / pilih dari daftar..."
                  value={selectedCustomer ? `${selectedCustomer.name} (${selectedCustomer.customerType})` : customerSearch}
                  onChange={e => {
                    setCustomerSearch(e.target.value);
                    if (selectedCustomerId) setSelectedCustomerId('');
                    setShowCustomerDropdown(true);
                  }}
                  onFocus={() => setShowCustomerDropdown(true)}
                  className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-teal-500 focus:outline-none"
                />
                {selectedCustomer && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCustomerId('');
                      setCustomerSearch('');
                    }}
                    className="px-3 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl font-semibold transition text-[11px]"
                  >
                    Pelanggan Umum
                  </button>
                )}
              </div>

              {/* Customer dropdown */}
              {showCustomerDropdown && !selectedCustomerId && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-30 max-h-48 overflow-y-auto divide-y divide-slate-100">
                  <div
                    onClick={() => {
                      setSelectedCustomerId('');
                      setCustomerSearch('');
                      setShowCustomerDropdown(false);
                    }}
                    className="p-2 hover:bg-slate-50 cursor-pointer font-semibold text-slate-700"
                  >
                    👤 Pelanggan Umum
                  </div>
                  {filteredCustomers.map(c => (
                    <div
                      key={c.id}
                      onClick={() => {
                        setSelectedCustomerId(c.id);
                        setCustomerSearch('');
                        setShowCustomerDropdown(false);
                      }}
                      className="p-2 hover:bg-teal-50 cursor-pointer flex items-center justify-between"
                    >
                      <div>
                        <div className="font-semibold text-slate-900">{c.name}</div>
                        <div className="text-[10px] text-slate-500">{c.phone || 'Tanpa no HP'} • {c.storeName || c.address || 'Langganan'}</div>
                      </div>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-teal-100 text-teal-800 font-bold">
                        {c.customerType}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* SECTION 3: PILIH MENU & ITEM PENJUALAN */}
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <label className="font-bold text-slate-800 flex items-center gap-1.5">
                <ShoppingBag size={14} className="text-teal-700" />
                <span>Daftar Menu / Produk yang Terjual ({items.length} item)</span>
              </label>
              <span className="text-[11px] text-slate-500">
                Pilih menu di bawah untuk menambahkan
              </span>
            </div>

            {/* Product Search & Quick Add Grid */}
            <div className="space-y-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                <input
                  id="retro-product-search"
                  type="text"
                  placeholder="Cari menu untuk ditambahkan ke nota susulan..."
                  value={productSearch}
                  onChange={e => setProductSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-teal-500 focus:outline-none"
                />
              </div>

              {/* Quick Products Chips */}
              <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-1 bg-slate-50/70 rounded-xl border border-slate-100">
                {filteredProducts.map(p => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleAddItem(p)}
                    className="px-2.5 py-1.5 bg-white hover:bg-teal-50 hover:border-teal-300 border border-slate-200 rounded-lg text-left shadow-2xs transition flex items-center gap-1.5 group"
                  >
                    <Plus size={13} className="text-teal-600 group-hover:scale-110 transition" />
                    <span className="font-semibold text-slate-800">{p.name}</span>
                    <span className="text-[10px] font-mono text-teal-700 font-bold bg-teal-50 px-1 py-0.2 rounded">
                      {formatRupiah(p.basePrice)}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Cart Items Table */}
            {items.length > 0 ? (
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-slate-100 text-slate-700 font-semibold text-[11px]">
                    <tr>
                      <th className="px-3 py-2 text-left">Nama Menu</th>
                      <th className="px-3 py-2 text-center">Harga Satuan</th>
                      <th className="px-3 py-2 text-center w-28">Jumlah (Qty)</th>
                      <th className="px-3 py-2 text-right">Subtotal</th>
                      <th className="px-2 py-2 text-center w-10"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {items.map(item => (
                      <tr key={item.id} className="hover:bg-slate-50/60">
                        <td className="px-3 py-2">
                          <div className="font-semibold text-slate-900">{item.productName}</div>
                          {item.selectedVariants.length > 0 && (
                            <div className="text-[10px] text-slate-500">
                              Varian: {item.selectedVariants.map(v => v.name).join(', ')}
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-2 text-center font-mono text-slate-700">
                          {formatRupiah(item.finalPricePerUnit)}
                        </td>
                        <td className="px-3 py-2 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleUpdateItemQty(item.id, item.quantity - 1)}
                              className="w-6 h-6 rounded-md bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-700 font-bold"
                            >
                              <Minus size={12} />
                            </button>
                            <input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={e => handleUpdateItemQty(item.id, parseInt(e.target.value) || 1)}
                              className="w-12 text-center font-bold text-slate-900 py-0.5 border border-slate-200 rounded-md text-xs"
                            />
                            <button
                              type="button"
                              onClick={() => handleUpdateItemQty(item.id, item.quantity + 1)}
                              className="w-6 h-6 rounded-md bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-700 font-bold"
                            >
                              <Plus size={12} />
                            </button>
                          </div>
                        </td>
                        <td className="px-3 py-2 text-right font-mono font-bold text-slate-900">
                          {formatRupiah(item.subtotal)}
                        </td>
                        <td className="px-2 py-2 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(item.id)}
                            className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50"
                            title="Hapus"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-6 text-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                Belum ada menu yang dipilih. Klik nama menu di atas untuk menambahkan.
              </div>
            )}
          </div>

          {/* SECTION 4: DISKON, PEMBAYARAN & TOTAL */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Left Column: Metode Pembayaran & Catatan */}
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-3">
              <div>
                <label className="font-bold text-slate-800 block mb-1.5">
                  Metode Pembayaran:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                  {(['TUNAI', 'QRIS', 'TRANSFER', 'KASBON', 'SALDO_DEPOSIT'] as PaymentMethod[]).map(m => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setPaymentMethod(m)}
                      className={`px-2.5 py-1.5 rounded-xl font-semibold text-[11px] border transition ${
                        paymentMethod === m
                          ? 'bg-teal-700 text-white border-teal-700 shadow-xs'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {m === 'SALDO_DEPOSIT' ? '💰 Deposit' : m === 'KASBON' ? '📝 Kasbon' : m}
                    </button>
                  ))}
                </div>
              </div>

              {/* Cash given for Tunai */}
              {paymentMethod === 'TUNAI' && (
                <div>
                  <label className="block text-slate-700 font-medium mb-1">
                    Uang Diterima (Rp):
                  </label>
                  <input
                    type="number"
                    placeholder={`Contoh: ${finalAmount}`}
                    value={cashGiven || ''}
                    onChange={e => setCashGiven(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-mono"
                  />
                  {cashGiven > finalAmount && (
                    <div className="text-[11px] text-teal-700 font-semibold mt-1">
                      Kembalian: {formatRupiah(cashGiven - finalAmount)}
                    </div>
                  )}
                </div>
              )}

              {/* Adjust Stock Checkbox */}
              <div className="pt-1">
                <label className="flex items-center gap-2 cursor-pointer bg-white p-2.5 rounded-xl border border-slate-200">
                  <input
                    type="checkbox"
                    checked={adjustStock}
                    onChange={e => setAdjustStock(e.target.checked)}
                    className="w-4 h-4 text-teal-600 rounded focus:ring-teal-500"
                  />
                  <div>
                    <span className="font-semibold text-slate-800 block text-xs">
                      Kurangi Stok Produk Sekarang
                    </span>
                    <span className="text-[10px] text-slate-500">
                      Otomatis memotong stok barang di gudang/warung
                    </span>
                  </div>
                </label>
              </div>

              {/* Catatan */}
              <div>
                <label className="block text-slate-700 font-medium mb-1">
                  Catatan / Keterangan Susulan:
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Pesanan offline kemarin belum sempat diinput kasir"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800"
                />
              </div>

              {/* Custom Invoice No */}
              <div>
                <label className="block text-slate-500 text-[10px] font-medium mb-0.5">
                  No. Nota (Opsional, kosongkan untuk auto):
                </label>
                <input
                  type="text"
                  placeholder="Otomatis dibuat berdasarkan tanggal"
                  value={customInvoiceNumber}
                  onChange={e => setCustomInvoiceNumber(e.target.value)}
                  className="w-full px-3 py-1 bg-white border border-slate-200 rounded-lg text-[11px] font-mono"
                />
              </div>
            </div>

            {/* Right Column: Ringkasan Biaya & Laba */}
            <div className="bg-slate-900 text-white p-4 rounded-xl space-y-2.5 flex flex-col justify-between">
              <div>
                <h4 className="font-bold text-teal-300 text-xs tracking-wider uppercase mb-2">
                  Ringkasan Transaksi Susulan
                </h4>

                <div className="space-y-1.5 text-xs text-slate-300">
                  <div className="flex justify-between">
                    <span>Subtotal Menu:</span>
                    <span className="font-mono font-semibold text-white">{formatRupiah(subtotal)}</span>
                  </div>

                  {/* Diskon */}
                  <div className="flex items-center justify-between pt-1 border-t border-slate-800">
                    <div className="flex items-center gap-1">
                      <span>Diskon:</span>
                      <select
                        value={discountType}
                        onChange={e => setDiscountType(e.target.value as DiscountType)}
                        className="bg-slate-800 text-white text-[10px] px-1.5 py-0.5 rounded border border-slate-700"
                      >
                        <option value="NOMINAL">Rp</option>
                        <option value="PERCENTAGE">%</option>
                      </select>
                      <input
                        type="number"
                        min="0"
                        value={discountInput || ''}
                        onChange={e => setDiscountInput(parseFloat(e.target.value) || 0)}
                        placeholder="0"
                        className="w-16 bg-slate-800 text-white text-xs px-1.5 py-0.5 rounded border border-slate-700 text-right font-mono"
                      />
                    </div>
                    <span className="font-mono text-red-400 font-semibold">
                      -{formatRupiah(calculatedDiscount)}
                    </span>
                  </div>

                  {/* Total HPP */}
                  <div className="flex justify-between pt-1 border-t border-slate-800 text-[11px] text-slate-400">
                    <span>Total HPP / Modal:</span>
                    <span className="font-mono">{formatRupiah(totalCost)}</span>
                  </div>

                  {/* Estimasi Laba Kotor */}
                  <div className="flex justify-between text-teal-400 font-semibold">
                    <span>Estimasi Laba Kotor:</span>
                    <span className="font-mono">{formatRupiah(grossProfit)}</span>
                  </div>
                </div>
              </div>

              {/* Total Final */}
              <div className="pt-3 border-t border-slate-800">
                <div className="flex justify-between items-baseline">
                  <span className="text-sm font-bold text-slate-200">Total Tagihan:</span>
                  <span className="text-xl font-bold font-mono text-teal-300">
                    {formatRupiah(finalAmount)}
                  </span>
                </div>
              </div>
            </div>

          </div>

        </form>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2.5 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 rounded-xl font-semibold text-xs transition"
          >
            Batal
          </button>
          <button
            id="save-retroactive-sale-btn"
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting || items.length === 0}
            className="px-5 py-2 bg-teal-700 hover:bg-teal-800 disabled:bg-slate-300 text-white rounded-xl font-bold text-xs shadow-md transition flex items-center gap-1.5"
          >
            <CheckCircle2 size={16} />
            <span>{isSubmitting ? 'Menyimpan...' : 'Simpan Penjualan Susulan'}</span>
          </button>
        </div>

      </div>

      {/* Variant Selector Modal Popup */}
      {selectedProductToAdd && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-4 border border-slate-200 space-y-3">
            <div className="flex justify-between items-center">
              <h4 className="font-bold text-slate-900 text-sm">
                Pilih Varian: {selectedProductToAdd.name}
              </h4>
              <button
                type="button"
                onClick={() => setSelectedProductToAdd(null)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {selectedProductToAdd.variants?.map(v => {
                const isSelected = productVariantSelections.some(sel => sel.id === v.id);
                return (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => setProductVariantSelections([v])}
                    className={`w-full p-2 rounded-xl text-left text-xs font-semibold flex items-center justify-between border transition ${
                      isSelected
                        ? 'bg-teal-50 border-teal-500 text-teal-900'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span>{v.name}</span>
                    <span className="font-mono text-[11px] text-teal-700">
                      {v.priceAdjustment > 0 ? `+${formatRupiah(v.priceAdjustment)}` : 'Harga Dasar'}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-slate-600 font-medium">Jumlah:</span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setAddQty(q => Math.max(1, q - 1))}
                  className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center font-bold"
                >
                  <Minus size={13} />
                </button>
                <span className="w-8 text-center font-bold text-xs">{addQty}</span>
                <button
                  type="button"
                  onClick={() => setAddQty(q => q + 1)}
                  className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center font-bold"
                >
                  <Plus size={13} />
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={handleConfirmVariantAdd}
              className="w-full py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-xl font-bold text-xs shadow-xs"
            >
              Tambahkan ke Nota
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
