import React, { useState, useMemo } from 'react';
import { useWarung } from '../context/WarungContext';
import {
  Transaction,
  CartItem,
  Customer,
  PaymentMethod,
  DiscountType,
  Product,
  ProductVariant,
} from '../types';
import { formatRupiah, formatDate } from '../utils/format';
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
  Search,
  RotateCcw,
  Edit3,
  ShieldAlert,
} from 'lucide-react';

interface EditTransactionModalProps {
  transaction: Transaction;
  onClose: () => void;
  onSuccess?: () => void;
}

export const EditTransactionModal: React.FC<EditTransactionModalProps> = ({
  transaction,
  onClose,
  onSuccess,
}) => {
  const {
    products,
    customers,
    currentUser,
    storeSettings,
    updateTransaction,
    deleteTransaction,
  } = useWarung();

  // 1. Date & Time
  const formatISOToInput = (isoString: string) => {
    try {
      const d = new Date(isoString);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const hours = String(d.getHours()).padStart(2, '0');
      const minutes = String(d.getMinutes()).padStart(2, '0');
      return `${year}-${month}-${day}T${hours}:${minutes}`;
    } catch {
      return '';
    }
  };

  const [dateTimeInput, setDateTimeInput] = useState<string>(
    formatISOToInput(transaction.timestamp)
  );

  // 2. Invoice & Cashier
  const [invoiceNumber, setInvoiceNumber] = useState<string>(transaction.invoiceNumber);
  const [cashierName, setCashierName] = useState<string>(transaction.cashierName || 'Kasir');

  // 3. Customer
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(
    transaction.customerId || ''
  );
  const [customerSearch, setCustomerSearch] = useState<string>('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState<boolean>(false);

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

  // 4. Cart Items
  const [items, setItems] = useState<CartItem[]>(() =>
    JSON.parse(JSON.stringify(transaction.items || []))
  );
  const [productSearch, setProductSearch] = useState('');
  const [selectedProductToAdd, setSelectedProductToAdd] = useState<Product | null>(null);
  const [productVariantSelections, setProductVariantSelections] = useState<ProductVariant[]>([]);
  const [addQty, setAddQty] = useState<number>(1);

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

  const handleAddItem = (prod: Product) => {
    if (prod.variants && prod.variants.length > 0) {
      setSelectedProductToAdd(prod);
      setProductVariantSelections([prod.variants[0]]);
      setAddQty(1);
      return;
    }

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
  const [discountType, setDiscountType] = useState<DiscountType>(
    transaction.discountType || 'NOMINAL'
  );
  const [discountInput, setDiscountInput] = useState<number>(
    transaction.discountRate !== undefined ? transaction.discountRate : (transaction.discount || 0)
  );

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

  const finalAmount = Math.max(0, subtotal - calculatedDiscount + (transaction.tax || 0));
  const grossProfit = finalAmount - totalCost;

  // 6. Payment & Other fields
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(transaction.paymentMethod);
  const [cashGiven, setCashGiven] = useState<number>(transaction.amountPaid || 0);
  const [notes, setNotes] = useState<string>(transaction.notes || '');
  const [editReason, setEditReason] = useState<string>('');
  const [adjustStockDifference, setAdjustStockDifference] = useState<boolean>(true);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (items.length === 0) {
      setErrorMsg('Transaksi harus memiliki minimal 1 item menu.');
      return;
    }

    if (!dateTimeInput) {
      setErrorMsg('Pilih tanggal dan jam transaksi yang valid.');
      return;
    }

    const isoDate = new Date(dateTimeInput).toISOString();

    setIsSubmitting(true);
    try {
      const res = updateTransaction(transaction.id, {
        timestamp: isoDate,
        invoiceNumber: invoiceNumber.trim() || transaction.invoiceNumber,
        items,
        paymentMethod,
        discountAmount: calculatedDiscount,
        discountType,
        discountRate: discountInput,
        cashGiven: paymentMethod === 'TUNAI' ? (cashGiven || finalAmount) : finalAmount,
        selectedCustomer: selectedCustomerId ? selectedCustomer : null,
        notes: notes.trim(),
        cashierName: cashierName.trim() || 'Admin',
        adjustStockDifference,
        editReason: editReason.trim() || 'Koreksi data penjualan oleh Admin',
      });

      if (res.success) {
        if (onSuccess) onSuccess();
        onClose();
      } else {
        setErrorMsg(res.message || 'Gagal memperbarui transaksi.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Terjadi kesalahan sistem saat memperbarui transaksi.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = () => {
    try {
      const res = deleteTransaction(transaction.id, true);
      if (res.success) {
        if (onSuccess) onSuccess();
        onClose();
      } else {
        setErrorMsg(res.message || 'Gagal menghapus transaksi.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Terjadi kesalahan sistem saat menghapus.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full my-auto overflow-hidden border border-slate-200 flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center font-bold text-lg">
              <Edit3 size={18} />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base flex items-center gap-2">
                Edit & Koreksi Data Penjualan
              </h3>
              <p className="text-[11px] text-slate-300 font-mono">
                No. Nota: {transaction.invoiceNumber} • Dibuat: {formatDate(transaction.timestamp)}
              </p>
            </div>
          </div>
          <button
            id="close-edit-modal-btn"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body Form */}
        <form onSubmit={handleSaveEdit} className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
          
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 flex items-center gap-2">
              <AlertCircle size={16} className="shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* SECTION 1: WAKTU & INFORMASI NOTA */}
          <div className="bg-amber-50/50 p-3.5 rounded-xl border border-amber-200/70 space-y-3">
            <label className="font-bold text-slate-800 flex items-center gap-1.5">
              <Calendar size={14} className="text-amber-700" />
              <span>Tanggal, Waktu & Identitas Transaksi</span>
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <span className="text-[11px] text-slate-600 block mb-1 font-medium">
                  Tanggal & Jam Transaksi:
                </span>
                <input
                  id="edit-datetime-input"
                  type="datetime-local"
                  value={dateTimeInput}
                  onChange={e => setDateTimeInput(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-amber-300 rounded-xl text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  required
                />
                <span className="text-[10px] text-amber-700 mt-1 block">
                  Ubah jika transaksi ini seharusnya terjadi kemarin atau waktu lampau
                </span>
              </div>

              <div>
                <span className="text-[11px] text-slate-600 block mb-1 font-medium">
                  No. Nota:
                </span>
                <input
                  id="edit-invoice-input"
                  type="text"
                  value={invoiceNumber}
                  onChange={e => setInvoiceNumber(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-800"
                  required
                />
              </div>

              <div>
                <span className="text-[11px] text-slate-600 block mb-1 font-medium">
                  Petugas / Kasir:
                </span>
                <input
                  id="edit-cashier-input"
                  type="text"
                  value={cashierName}
                  onChange={e => setCashierName(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800"
                />
              </div>
            </div>
          </div>

          {/* SECTION 2: PELANGGAN */}
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
            <label className="font-bold text-slate-800 flex items-center gap-1.5">
              <User size={14} className="text-slate-600" />
              <span>Pelanggan</span>
            </label>

            <div className="relative">
              <div className="flex gap-2">
                <input
                  id="edit-cust-search"
                  type="text"
                  placeholder="Ketik nama pelanggan untuk mengubah..."
                  value={selectedCustomer ? `${selectedCustomer.name} (${selectedCustomer.customerType})` : (transaction.customerName || 'Pelanggan Umum')}
                  onChange={e => {
                    setCustomerSearch(e.target.value);
                    setSelectedCustomerId('');
                    setShowCustomerDropdown(true);
                  }}
                  onFocus={() => setShowCustomerDropdown(true)}
                  className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCustomerId('');
                    setCustomerSearch('');
                  }}
                  className="px-3 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl font-semibold transition text-[11px]"
                >
                  Set Umum
                </button>
              </div>

              {showCustomerDropdown && (
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
                      className="p-2 hover:bg-amber-50 cursor-pointer flex items-center justify-between"
                    >
                      <div>
                        <div className="font-semibold text-slate-900">{c.name}</div>
                        <div className="text-[10px] text-slate-500">{c.phone || 'Tanpa no HP'} • {c.storeName || c.address || 'Langganan'}</div>
                      </div>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-bold">
                        {c.customerType}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* SECTION 3: EDIT ITEM MENU */}
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <label className="font-bold text-slate-800 flex items-center gap-1.5">
                <ShoppingBag size={14} className="text-amber-700" />
                <span>Rincian Item Menu Terjual ({items.length} item)</span>
              </label>
              <span className="text-[11px] text-slate-500">
                Ubah jumlah, hapus, atau tambah menu baru
              </span>
            </div>

            {/* Quick Add Product */}
            <div className="space-y-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                <input
                  id="edit-product-search"
                  type="text"
                  placeholder="Tambah menu lain ke transaksi ini..."
                  value={productSearch}
                  onChange={e => setProductSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              {productSearch && (
                <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-1 bg-slate-50 rounded-xl border border-slate-200">
                  {filteredProducts.map(p => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => handleAddItem(p)}
                      className="px-2.5 py-1.5 bg-white hover:bg-amber-50 border border-slate-200 rounded-lg text-left shadow-2xs transition flex items-center gap-1.5"
                    >
                      <Plus size={13} className="text-amber-600" />
                      <span className="font-semibold text-slate-800">{p.name}</span>
                      <span className="text-[10px] font-mono text-amber-700 font-bold">
                        {formatRupiah(p.basePrice)}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Items Table */}
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
                          title="Hapus item"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* SECTION 4: PEMBAYARAN, DISKON, PENYESUAIAN STOK */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Left Column: Metode Pembayaran & Catatan Edit */}
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
                          ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {m === 'SALDO_DEPOSIT' ? '💰 Deposit' : m === 'KASBON' ? '📝 Kasbon' : m}
                    </button>
                  ))}
                </div>
              </div>

              {/* Adjust Stock Checkbox */}
              <div>
                <label className="flex items-center gap-2 cursor-pointer bg-white p-2.5 rounded-xl border border-slate-200">
                  <input
                    type="checkbox"
                    checked={adjustStockDifference}
                    onChange={e => setAdjustStockDifference(e.target.checked)}
                    className="w-4 h-4 text-amber-600 rounded focus:ring-amber-500"
                  />
                  <div>
                    <span className="font-semibold text-slate-800 block text-xs">
                      Sesuaikan Selisih Stok Otomatis
                    </span>
                    <span className="text-[10px] text-slate-500">
                      Menambah/mengurangi stok produk sesuai selisih jumlah item lama vs baru
                    </span>
                  </div>
                </label>
              </div>

              {/* Alasan Edit */}
              <div>
                <label className="block text-slate-700 font-medium mb-1">
                  Alasan Perubahan / Koreksi:
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Koreksi jumlah porsi kemarin / salah input tanggal"
                  value={editReason}
                  onChange={e => setEditReason(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800"
                  required
                />
              </div>

              {/* Catatan Transaksi */}
              <div>
                <label className="block text-slate-700 font-medium mb-1">
                  Catatan Nota:
                </label>
                <input
                  type="text"
                  placeholder="Catatan pesanan..."
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800"
                />
              </div>
            </div>

            {/* Right Column: Ringkasan Nilai Transaksi */}
            <div className="bg-slate-900 text-white p-4 rounded-xl space-y-2.5 flex flex-col justify-between">
              <div>
                <h4 className="font-bold text-amber-400 text-xs tracking-wider uppercase mb-2">
                  Ringkasan Nilai Transaksi
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
                    <span>Laba Kotor:</span>
                    <span className="font-mono">{formatRupiah(grossProfit)}</span>
                  </div>
                </div>
              </div>

              {/* Total Final */}
              <div className="pt-3 border-t border-slate-800">
                <div className="flex justify-between items-baseline">
                  <span className="text-sm font-bold text-slate-200">Total Akhir:</span>
                  <span className="text-xl font-bold font-mono text-amber-400">
                    {formatRupiah(finalAmount)}
                  </span>
                </div>
              </div>
            </div>

          </div>

        </form>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <div>
            {!showDeleteConfirm ? (
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-xl font-semibold text-xs transition flex items-center gap-1 border border-transparent hover:border-red-200"
              >
                <Trash2 size={14} />
                <span>Hapus Transaksi</span>
              </button>
            ) : (
              <div className="flex items-center gap-2 bg-red-50 p-1.5 rounded-xl border border-red-200">
                <span className="text-[11px] text-red-700 font-semibold">Yakin hapus?</span>
                <button
                  type="button"
                  onClick={handleDelete}
                  className="px-2.5 py-1 bg-red-600 text-white rounded-lg font-bold text-[11px] hover:bg-red-700"
                >
                  Ya, Hapus
                </button>
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-2 py-1 text-slate-600 hover:text-slate-900 text-[11px]"
                >
                  Batal
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 rounded-xl font-semibold text-xs transition"
            >
              Tutup
            </button>
            <button
              id="save-edit-transaction-btn"
              type="button"
              onClick={handleSaveEdit}
              disabled={isSubmitting || items.length === 0}
              className="px-5 py-2 bg-amber-600 hover:bg-amber-700 disabled:bg-slate-300 text-white rounded-xl font-bold text-xs shadow-md transition flex items-center gap-1.5"
            >
              <CheckCircle2 size={16} />
              <span>{isSubmitting ? 'Menyimpan...' : 'Simpan Perubahan'}</span>
            </button>
          </div>
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
                        ? 'bg-amber-50 border-amber-500 text-amber-900'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span>{v.name}</span>
                    <span className="font-mono text-[11px] text-amber-700">
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
              className="w-full py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold text-xs shadow-xs"
            >
              Tambahkan ke Nota
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
