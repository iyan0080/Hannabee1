import React, { useState, useMemo } from 'react';
import { useWarung } from '../context/WarungContext';
import { Product, ProductCategory, ProductVariant, PaymentMethod, Customer, Transaction, CustomerType, DiscountType } from '../types';
import { formatRupiah } from '../utils/format';
import { ReceiptModal } from './ReceiptModal';
import confetti from 'canvas-confetti';
import {
  Search,
  Plus,
  Minus,
  Trash2,
  User,
  UserPlus,
  CreditCard,
  QrCode,
  Banknote,
  BookOpen,
  CheckCircle2,
  Percent,
  FileText,
  Layers,
  X,
  Sparkles,
  Wallet,
  AlertCircle,
  TrendingUp,
  Receipt,
  DollarSign,
  ArrowUpRight,
  Store,
  Tag,
  ShieldCheck,
} from 'lucide-react';

const CATEGORIES: ('Semua' | ProductCategory)[] = [
  'Semua',
  'Makanan',
  'Minuman',
  'Snack & Gorengan',
  'Sembako & Kebutuhan',
  'Rokok & Pulsa',
  'Lainnya',
];

export const POSView: React.FC = () => {
  const {
    products,
    customers,
    transactions,
    cart,
    selectedCustomer,
    paymentMethod,
    cashGiven,
    discountType,
    discountInput,
    discountAmount,
    cartNotes,
    storeSettings,
    addToCart,
    updateCartItemQuantity,
    removeFromCart,
    clearCart,
    setSelectedCustomer,
    setPaymentMethod,
    setCashGiven,
    setDiscountType,
    setDiscountInput,
    setDiscountAmount,
    applyResellerDiscount,
    setCartNotes,
    processCheckout,
    addCustomer,
  } = useWarung();

  // Search & Filter
  const [selectedCategory, setSelectedCategory] = useState<'Semua' | ProductCategory>('Semua');
  const [searchQuery, setSearchQuery] = useState('');

  // Variant Modal State
  const [variantModalProduct, setVariantModalProduct] = useState<Product | null>(null);
  const [selectedVariants, setSelectedVariants] = useState<ProductVariant[]>([]);
  const [variantNotes, setVariantNotes] = useState('');
  const [variantQuantity, setVariantQuantity] = useState(1);

  // Quick Customer Modal
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);
  const [newCustType, setNewCustType] = useState<CustomerType>('UMUM');
  const [newCustName, setNewCustName] = useState('');
  const [newCustStoreName, setNewCustStoreName] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');
  const [newCustAddress, setNewCustAddress] = useState('');
  const [newCustDiscountType, setNewCustDiscountType] = useState<DiscountType>('PERCENTAGE');
  const [newCustDiscountValue, setNewCustDiscountValue] = useState<number>(10);

  // Completed Receipt Modal State
  const [completedTransaction, setCompletedTransaction] = useState<Transaction | null>(null);

  // Filtered Products (Exclude archived products)
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      if (p.isArchived) return false;
      const matchCategory = selectedCategory === 'Semua' || p.category === selectedCategory;
      const matchSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.barcode && p.barcode.includes(searchQuery));
      return matchCategory && matchSearch && p.isAvailable;
    });
  }, [products, selectedCategory, searchQuery]);

  // Cart Calculations
  const cartSubtotal = cart.reduce((sum, item) => sum + item.subtotal, 0);
  const taxAmount = storeSettings.enableTax ? (cartSubtotal * storeSettings.taxRate) / 100 : 0;
  const cartFinalTotal = Math.max(0, cartSubtotal - discountAmount + taxAmount);
  const changeAmount = (paymentMethod === 'TUNAI' && cashGiven > cartFinalTotal) ? cashGiven - cartFinalTotal : 0;

  // Handle Product Click
  const handleProductClick = (product: Product) => {
    if (product.variants && product.variants.length > 0) {
      setVariantModalProduct(product);
      setSelectedVariants([]);
      setVariantNotes('');
      setVariantQuantity(1);
    } else {
      addToCart(product, [], 1);
    }
  };

  // Add Product with chosen variants
  const handleConfirmVariants = () => {
    if (!variantModalProduct) return;
    addToCart(variantModalProduct, selectedVariants, variantQuantity, variantNotes);
    setVariantModalProduct(null);
  };

  // Toggle Variant selection
  const toggleVariant = (variant: ProductVariant) => {
    if (selectedVariants.some(v => v.id === variant.id)) {
      setSelectedVariants(prev => prev.filter(v => v.id !== variant.id));
    } else {
      setSelectedVariants(prev => [...prev, variant]);
    }
  };

  // Quick Cash Buttons calculations
  const fastCashAmounts = useMemo(() => {
    const amounts = [cartFinalTotal];
    const roundedUp10k = Math.ceil(cartFinalTotal / 10000) * 10000;
    const roundedUp20k = Math.ceil(cartFinalTotal / 20000) * 20000;
    const roundedUp50k = Math.ceil(cartFinalTotal / 50000) * 50000;
    const roundedUp100k = Math.ceil(cartFinalTotal / 100000) * 100000;

    [roundedUp10k, roundedUp20k, roundedUp50k, roundedUp100k, 50000, 100000].forEach(amt => {
      if (amt >= cartFinalTotal && !amounts.includes(amt) && amt > 0) {
        amounts.push(amt);
      }
    });

    return amounts.sort((a, b) => a - b).slice(0, 5);
  }, [cartFinalTotal]);

  // Handle Fast Checkout
  const handleCheckout = () => {
    if (cart.length === 0) return;

    if (paymentMethod === 'KASBON' && !selectedCustomer) {
      alert('Untuk metode KASBON (Hutang), silakan pilih data Pelanggan terlebih dahulu agar tercatat rapi.');
      return;
    }

    if (paymentMethod === 'SALDO_DEPOSIT') {
      if (!selectedCustomer) {
        alert('Untuk metode Saldo Deposit, silakan pilih data Pelanggan terlebih dahulu.');
        return;
      }
      const custBalance = selectedCustomer.depositBalance || 0;
      if (custBalance < cartFinalTotal) {
        alert(`Saldo deposit ${selectedCustomer.name} (${formatRupiah(custBalance)}) tidak mencukupi untuk total bayar ${formatRupiah(cartFinalTotal)}. Silakan lakukan Top-Up saldo terlebih dahulu di menu Pelanggan.`);
        return;
      }
    }

    if (paymentMethod === 'TUNAI' && cashGiven < cartFinalTotal) {
      alert(`Uang tunai yang diterima (${formatRupiah(cashGiven)}) kurang dari total belanja (${formatRupiah(cartFinalTotal)}).`);
      return;
    }

    const trx = processCheckout();
    if (trx) {
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.7 },
      });
      setCompletedTransaction(trx);
      clearCart();
    }
  };

  // Handle Fast Add Customer
  const handleSaveQuickCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustName.trim()) return;

    const isReseller = newCustType === 'RESELLER';
    const created = addCustomer({
      customerType: newCustType,
      name: newCustName.trim(),
      storeName: isReseller ? newCustStoreName.trim() : undefined,
      phone: newCustPhone.trim(),
      address: newCustAddress.trim(),
      resellerDiscountType: isReseller ? newCustDiscountType : undefined,
      resellerDiscountValue: isReseller ? Number(newCustDiscountValue) || 0 : undefined,
    });

    setSelectedCustomer(created);
    setShowAddCustomerModal(false);
    setNewCustType('UMUM');
    setNewCustName('');
    setNewCustStoreName('');
    setNewCustPhone('');
    setNewCustAddress('');
    setNewCustDiscountType('PERCENTAGE');
    setNewCustDiscountValue(10);
  };

  return (
    <div className="max-w-7xl mx-auto p-3 sm:p-5 space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* LEFT COLUMN: Products catalog & Category navigation */}
        <div className="lg:col-span-7 xl:col-span-8 flex flex-col space-y-4">
          
          {/* Top Search & Stats Bar */}
          <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                id="pos-search-input"
                type="text"
                placeholder="Cari menu, varian, sembako, atau scan barcode..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X size={15} />
                </button>
              )}
            </div>
            <div className="text-xs text-slate-500 font-medium px-2 whitespace-nowrap">
              {filteredProducts.length} Produk Tersedia
            </div>
          </div>

          {/* Category Filter Pills */}
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                id={`cat-filter-${cat.replace(/\s+/g, '-').toLowerCase()}`}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                  selectedCategory === cat
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Products Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
            {filteredProducts.map(product => {
              const hasVariants = product.variants && product.variants.length > 0;
              const isLowStock = product.stock <= 5;
              const hasImage = !!product.imageUrl;

              return (
                <button
                  key={product.id}
                  id={`product-card-${product.id}`}
                  onClick={() => handleProductClick(product)}
                  className="bg-white p-3 rounded-2xl border border-slate-200 hover:border-emerald-500 hover:shadow-md transition-all text-left flex flex-col justify-between group relative overflow-hidden active:scale-95"
                >
                  {hasVariants && (
                    <span className="absolute top-2 right-2 z-10 bg-emerald-600/90 backdrop-blur-xs text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-0.5 shadow-2xs">
                      <Layers size={10} />
                      {product.variants.length} Varian
                    </span>
                  )}
                  
                  <div>
                    {hasImage ? (
                      <div className="w-full h-28 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 mb-2 group-hover:scale-[1.02] transition-transform">
                        <img
                          src={product.imageUrl}
                          alt={product.name}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="w-full h-20 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-3xl mb-2 group-hover:scale-105 transition-transform">
                        {product.emoji || '🍽️'}
                      </div>
                    )}

                    <h4 className="font-semibold text-xs text-slate-900 line-clamp-2 leading-snug">
                      {product.name}
                    </h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Stok: <span className={isLowStock ? 'text-amber-600 font-bold' : 'text-slate-600'}>{product.stock} {product.unit}</span>
                    </p>
                  </div>

                  <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-xs text-emerald-700 font-mono">
                        {formatRupiah(product.basePrice)}
                      </span>
                    </div>
                    <div className="w-6 h-6 rounded-lg bg-emerald-50 group-hover:bg-emerald-600 text-emerald-600 group-hover:text-white flex items-center justify-center transition">
                      <Plus size={14} />
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {filteredProducts.length === 0 && (
            <div className="bg-white rounded-2xl p-10 text-center border border-slate-200">
              <p className="text-sm text-slate-500">Tidak ada menu atau produk yang sesuai pencarian.</p>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: Interactive Cart & Fast Checkout */}
        <div className="lg:col-span-5 xl:col-span-4 flex flex-col space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-full">
            
            {/* Cart Header & Customer selector */}
            <div className="p-4 border-b border-slate-200 bg-slate-50/70">
              <div className="flex items-center justify-between mb-2.5">
                <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2">
                  <span>Keranjang Kasir</span>
                  {cart.length > 0 && (
                    <span className="bg-emerald-600 text-white text-xs px-2 py-0.2 rounded-full font-bold">
                      {cart.reduce((s, i) => s + i.quantity, 0)} item
                    </span>
                  )}
                </h3>
                {cart.length > 0 && (
                  <button
                    id="clear-cart-btn"
                    onClick={clearCart}
                    className="text-xs text-red-600 hover:text-red-700 font-medium flex items-center gap-1"
                  >
                    <Trash2 size={13} />
                    Kosongkan
                  </button>
                )}
              </div>

              {/* Customer Selector */}
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                  <select
                    id="cart-customer-select"
                    value={selectedCustomer?.id || ''}
                    onChange={e => {
                      const found = customers.find(c => c.id === e.target.value);
                      setSelectedCustomer(found || null);
                    }}
                    className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                  >
                    <option value="">Pelanggan Umum (Non-Member / Walk-in)</option>
                    
                    {/* Reseller Group */}
                    {customers.filter(c => c.customerType === 'RESELLER').length > 0 && (
                      <optgroup label="⭐ Pelanggan Reseller (Mitra Usaha)">
                        {customers
                          .filter(c => c.customerType === 'RESELLER')
                          .map(c => {
                            const discText = c.resellerDiscountValue
                              ? ` [Diskon: ${c.resellerDiscountType === 'PERCENTAGE' ? `${c.resellerDiscountValue}%` : formatRupiah(c.resellerDiscountValue)}]`
                              : '';
                            const storeTxt = c.storeName ? ` (${c.storeName})` : '';
                            return (
                              <option key={c.id} value={c.id}>
                                ⭐ {c.name}{storeTxt}{discText} - {c.phone}
                              </option>
                            );
                          })}
                      </optgroup>
                    )}

                    {/* Umum Group */}
                    <optgroup label="👤 Pelanggan Umum Terdaftar">
                      {customers
                        .filter(c => c.customerType !== 'RESELLER')
                        .map(c => {
                          const depositTxt = (c.depositBalance || 0) > 0 ? ` [Saldo: ${formatRupiah(c.depositBalance)}]` : '';
                          const debtTxt = c.totalDebt > 0 ? ` (Bon: ${formatRupiah(c.totalDebt)})` : '';
                          return (
                            <option key={c.id} value={c.id}>
                              {c.name}{depositTxt}{debtTxt} - {c.phone}
                            </option>
                          );
                        })}
                    </optgroup>
                  </select>
                </div>
                <button
                  id="add-customer-pos-btn"
                  onClick={() => setShowAddCustomerModal(true)}
                  className="p-2 bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 rounded-xl transition flex items-center gap-1 text-xs font-semibold"
                  title="Tambah Pelanggan / Reseller Baru"
                >
                  <UserPlus size={16} />
                </button>
              </div>

              {selectedCustomer && (
                <div className="mt-2 space-y-1.5">
                  {/* Reseller Active Banner */}
                  {selectedCustomer.customerType === 'RESELLER' && (
                    <div className="flex items-center justify-between bg-amber-500/10 border border-amber-300/80 rounded-xl p-2 text-xs text-amber-900">
                      <div className="flex items-center gap-1.5">
                        <Store size={14} className="text-amber-700" />
                        <div>
                          <span className="font-bold text-amber-900">Pelanggan Reseller</span>
                          {selectedCustomer.storeName && (
                            <span className="text-[11px] text-amber-800 ml-1 font-medium">({selectedCustomer.storeName})</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] bg-amber-200 text-amber-900 px-2 py-0.5 rounded-full font-bold">
                          {selectedCustomer.resellerDiscountType === 'PERCENTAGE' 
                            ? `Diskon ${selectedCustomer.resellerDiscountValue || 0}%` 
                            : `Diskon ${formatRupiah(selectedCustomer.resellerDiscountValue || 0)}`}
                        </span>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-1.5">
                    <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-lg px-2.5 py-1 text-[11px] text-emerald-900">
                      <span className="flex items-center gap-1 font-medium">
                        <Wallet size={12} className="text-emerald-600" /> Saldo:
                      </span>
                      <span className="font-bold text-emerald-700 font-mono">
                        {formatRupiah(selectedCustomer.depositBalance || 0)}
                      </span>
                    </div>
                    {selectedCustomer.totalDebt > 0 ? (
                      <div className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1 text-[11px] text-amber-900">
                        <span>Kasbon:</span>
                        <span className="font-bold text-amber-700 font-mono">{formatRupiah(selectedCustomer.totalDebt)}</span>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-[11px] text-slate-600">
                        <span>Kasbon:</span>
                        <span className="font-semibold text-slate-700 font-mono">Rp 0</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Cart Items List */}
            <div className="p-3 flex-1 overflow-y-auto max-h-[300px] min-h-[160px] space-y-2 divide-y divide-slate-100">
              {cart.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
                  <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-2">
                    🛒
                  </div>
                  <p className="text-xs font-medium">Keranjang masih kosong</p>
                  <p className="text-[11px] text-slate-400">Pilih menu di samping untuk mulai transaksi</p>
                </div>
              ) : (
                cart.map(item => (
                  <div key={item.id} className="pt-2 first:pt-0">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 pr-2">
                        <h5 className="font-semibold text-xs text-slate-900">{item.productName}</h5>
                        {item.selectedVariants.length > 0 && (
                          <p className="text-[11px] text-emerald-700">
                            + {item.selectedVariants.map(v => `${v.name} (${formatRupiah(v.priceAdjustment)})`).join(', ')}
                          </p>
                        )}
                        {item.notes && (
                          <p className="text-[10px] text-slate-400 italic">Catatan: {item.notes}</p>
                        )}
                        <span className="text-xs text-slate-600 font-mono">
                          {formatRupiah(item.finalPricePerUnit)} / unit
                        </span>
                      </div>
                      
                      <div className="text-right">
                        <span className="font-bold text-xs text-slate-900 block font-mono">
                          {formatRupiah(item.subtotal)}
                        </span>
                      </div>
                    </div>

                    {/* Quantity adjust buttons */}
                    <div className="flex items-center justify-between mt-1.5">
                      <button
                        onClick={() => removeFromCart(item.id)}
                        className="text-[11px] text-red-500 hover:text-red-700 flex items-center gap-0.5"
                      >
                        <Trash2 size={12} /> Hapus
                      </button>

                      <div className="flex items-center gap-1.5 bg-slate-100 rounded-lg p-0.5 border border-slate-200">
                        <button
                          onClick={() => updateCartItemQuantity(item.id, -1)}
                          className="w-6 h-6 rounded bg-white text-slate-700 hover:bg-slate-200 flex items-center justify-center font-bold text-xs"
                        >
                          <Minus size={12} />
                        </button>
                        <span className="text-xs font-bold w-6 text-center text-slate-800">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateCartItemQuantity(item.id, 1)}
                          className="w-6 h-6 rounded bg-white text-slate-700 hover:bg-slate-200 flex items-center justify-center font-bold text-xs"
                        >
                          <Plus size={12} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Payment & Checkout Section */}
            {cart.length > 0 && (
              <div className="p-4 border-t border-slate-200 bg-slate-50/50 space-y-3">
                {/* Discount Controller */}
                <div className="bg-white border border-slate-200 rounded-xl p-2.5 space-y-2 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-800 flex items-center gap-1">
                      <Tag size={13} className="text-blue-600" /> Potongan / Diskon:
                    </span>
                    <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                      <button
                        type="button"
                        onClick={() => setDiscountType('PERCENTAGE')}
                        className={`px-2 py-0.5 text-[10px] font-bold rounded-md transition ${
                          discountType === 'PERCENTAGE'
                            ? 'bg-blue-600 text-white shadow-2xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        % Persen
                      </button>
                      <button
                        type="button"
                        onClick={() => setDiscountType('NOMINAL')}
                        className={`px-2 py-0.5 text-[10px] font-bold rounded-md transition ${
                          discountType === 'NOMINAL'
                            ? 'bg-blue-600 text-white shadow-2xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Rp Nominal
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <div className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">
                        {discountType === 'PERCENTAGE' ? '%' : 'Rp'}
                      </div>
                      <input
                        id="cart-discount-input"
                        type="number"
                        min="0"
                        max={discountType === 'PERCENTAGE' ? 100 : cartSubtotal}
                        step={discountType === 'PERCENTAGE' ? '1' : '1000'}
                        value={discountInput || ''}
                        placeholder="0"
                        onChange={e => setDiscountInput(Number(e.target.value) || 0)}
                        className="w-full pl-8 pr-3 py-1 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    {discountAmount > 0 && (
                      <div className="text-right whitespace-nowrap">
                        <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-200">
                          -{formatRupiah(discountAmount)}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Preset quick buttons */}
                  <div className="flex items-center gap-1 overflow-x-auto pt-0.5 pb-0.5">
                    {discountType === 'PERCENTAGE' ? (
                      <>
                        {[5, 10, 15, 20, 25].map(pct => (
                          <button
                            key={pct}
                            type="button"
                            onClick={() => setDiscountInput(pct)}
                            className={`text-[10px] px-2 py-0.5 rounded-md font-semibold border transition ${
                              discountInput === pct
                                ? 'bg-blue-100 border-blue-400 text-blue-800'
                                : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                            }`}
                          >
                            {pct}%
                          </button>
                        ))}
                      </>
                    ) : (
                      <>
                        {[2000, 5000, 10000, 20000].map(nom => (
                          <button
                            key={nom}
                            type="button"
                            onClick={() => setDiscountInput(nom)}
                            className={`text-[10px] px-1.5 py-0.5 rounded-md font-semibold border transition ${
                              discountInput === nom
                                ? 'bg-blue-100 border-blue-400 text-blue-800'
                                : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                            }`}
                          >
                            {nom >= 1000 ? `${nom / 1000}rb` : nom}
                          </button>
                        ))}
                      </>
                    )}
                    {discountInput > 0 && (
                      <button
                        type="button"
                        onClick={() => setDiscountInput(0)}
                        className="text-[10px] px-1.5 py-0.5 rounded-md font-medium text-red-600 hover:bg-red-50 ml-auto"
                      >
                        Reset
                      </button>
                    )}
                  </div>
                </div>

                {/* Calculations summary */}
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>Subtotal:</span>
                    <span className="font-semibold font-mono">{formatRupiah(cartSubtotal)}</span>
                  </div>

                  {discountAmount > 0 && (
                    <div className="flex justify-between text-emerald-700">
                      <span>Potongan Diskon ({discountType === 'PERCENTAGE' ? `${discountInput}%` : 'Nominal'}):</span>
                      <span className="font-semibold font-mono">-{formatRupiah(discountAmount)}</span>
                    </div>
                  )}

                  {storeSettings.enableTax && (
                    <div className="flex justify-between text-slate-600">
                      <span>Pajak ({storeSettings.taxRate}%):</span>
                      <span className="font-semibold font-mono">+{formatRupiah(taxAmount)}</span>
                    </div>
                  )}

                  <div className="flex justify-between text-base font-bold text-slate-900 pt-1 border-t border-slate-200">
                    <span>Total Bayar:</span>
                    <span className="text-blue-700 font-mono">{formatRupiah(cartFinalTotal)}</span>
                  </div>
                </div>

                {/* Payment Method Switcher */}
                <div>
                  <label className="block text-[11px] font-medium text-slate-700 mb-1.5">
                    Metode Pembayaran:
                  </label>
                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
                    {(
                      [
                        { id: 'TUNAI', label: 'Tunai', icon: <Banknote size={14} /> },
                        { id: 'QRIS', label: 'QRIS', icon: <QrCode size={14} /> },
                        { id: 'TRANSFER', label: 'Transfer', icon: <CreditCard size={14} /> },
                        { id: 'SALDO_DEPOSIT', label: 'Deposit', icon: <Wallet size={14} /> },
                        { id: 'KASBON', label: 'Kasbon', icon: <BookOpen size={14} /> },
                      ] as { id: PaymentMethod; label: string; icon: React.ReactNode }[]
                    ).map(m => (
                      <button
                        key={m.id}
                        id={`payment-method-${m.id.toLowerCase()}`}
                        onClick={() => {
                          setPaymentMethod(m.id);
                          if (m.id === 'TUNAI' && cashGiven === 0) {
                            setCashGiven(cartFinalTotal);
                          }
                        }}
                        className={`py-2 px-1 rounded-xl text-[11px] font-semibold flex flex-col items-center justify-center gap-1 border transition ${
                          paymentMethod === m.id
                            ? m.id === 'KASBON'
                              ? 'bg-amber-600 border-amber-600 text-white shadow-xs'
                              : m.id === 'SALDO_DEPOSIT'
                              ? 'bg-emerald-600 border-emerald-600 text-white shadow-xs'
                              : 'bg-blue-600 border-blue-600 text-white shadow-xs'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        {m.icon}
                        <span className="truncate">{m.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Tunai Cash input and fast pills */}
                {paymentMethod === 'TUNAI' && (
                  <div className="space-y-1.5 bg-blue-50/60 p-2.5 rounded-xl border border-blue-100">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-blue-900">Uang Diterima:</span>
                      <input
                        id="cash-given-input"
                        type="number"
                        min="0"
                        step="1000"
                        value={cashGiven || ''}
                        onChange={e => setCashGiven(Number(e.target.value) || 0)}
                        className="w-32 px-2 py-1 text-right bg-white border border-blue-300 rounded-lg text-xs font-bold text-blue-900 font-mono focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    {/* Fast cash pills */}
                    <div className="flex flex-wrap gap-1">
                      {fastCashAmounts.map(amt => (
                        <button
                          key={amt}
                          onClick={() => setCashGiven(amt)}
                          className={`px-2 py-0.5 rounded-md text-[10px] font-semibold transition ${
                            cashGiven === amt
                              ? 'bg-blue-700 text-white'
                              : 'bg-white text-blue-800 border border-blue-200 hover:bg-blue-100'
                          }`}
                        >
                          {amt === cartFinalTotal ? 'Uang Pas' : formatRupiah(amt)}
                        </button>
                      ))}
                    </div>

                    {cashGiven >= cartFinalTotal && (
                      <div className="flex justify-between text-xs pt-1 border-t border-blue-200/60 text-blue-950 font-bold">
                        <span>Kembalian:</span>
                        <span className="font-mono text-sm">{formatRupiah(changeAmount)}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Saldo Deposit Panel */}
                {paymentMethod === 'SALDO_DEPOSIT' && (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-2.5 text-xs text-emerald-950 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold flex items-center gap-1 text-emerald-900">
                        <Wallet size={13} className="text-emerald-700" />
                        Pembayaran Saldo Deposit
                      </span>
                      {selectedCustomer && (
                        <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-semibold">
                          {selectedCustomer.name}
                        </span>
                      )}
                    </div>

                    {!selectedCustomer ? (
                      <div className="flex items-center gap-1.5 text-amber-700 bg-amber-50 p-2 rounded-lg border border-amber-200 text-[11px]">
                        <AlertCircle size={14} className="shrink-0" />
                        <span>Pilih nama pelanggan di atas yang memiliki saldo deposit untuk membayar.</span>
                      </div>
                    ) : (
                      <div className="space-y-1 bg-white/80 p-2 rounded-lg border border-emerald-100">
                        <div className="flex justify-between text-[11px] text-slate-600">
                          <span>Saldo Deposit Saat Ini:</span>
                          <span className="font-bold font-mono text-emerald-800">
                            {formatRupiah(selectedCustomer.depositBalance || 0)}
                          </span>
                        </div>
                        <div className="flex justify-between text-[11px] text-slate-600">
                          <span>Dipotong Belanja:</span>
                          <span className="font-bold font-mono text-red-600">
                            - {formatRupiah(cartFinalTotal)}
                          </span>
                        </div>
                        <div className="flex justify-between text-xs font-bold pt-1 border-t border-slate-200 text-slate-800">
                          <span>Sisa Saldo Nanti:</span>
                          <span
                            className={`font-mono ${
                              (selectedCustomer.depositBalance || 0) >= cartFinalTotal
                                ? 'text-emerald-700'
                                : 'text-red-600'
                            }`}
                          >
                            {formatRupiah(
                              Math.max(0, (selectedCustomer.depositBalance || 0) - cartFinalTotal)
                            )}
                          </span>
                        </div>

                        {(selectedCustomer.depositBalance || 0) < cartFinalTotal && (
                          <div className="text-[10px] text-red-600 font-semibold mt-1">
                            ⚠️ Saldo tidak mencukupi (Kurang {formatRupiah(cartFinalTotal - (selectedCustomer.depositBalance || 0))}). Silakan Top-Up di menu Pelanggan.
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Kasbon Warning */}
                {paymentMethod === 'KASBON' && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-2.5 text-xs text-amber-900 space-y-1">
                    <p className="font-semibold flex items-center gap-1">
                      <BookOpen size={13} />
                      Pencatatan Kasbon / Hutang
                    </p>
                    <p className="text-[11px] text-amber-800">
                      Total <b>{formatRupiah(cartFinalTotal)}</b> akan otomatis tercatat sebagai piutang di data pelanggan{' '}
                      <b>{selectedCustomer ? selectedCustomer.name : '(Pilih Pelanggan Dulu)'}</b>.
                    </p>
                  </div>
                )}

                {/* Notes Input */}
                <input
                  id="cart-notes-input"
                  type="text"
                  placeholder="Catatan transaksi (opsional)..."
                  value={cartNotes}
                  onChange={e => setCartNotes(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />

                {/* Checkout Submit Button */}
                <button
                  id="submit-checkout-btn"
                  onClick={handleCheckout}
                  disabled={
                    paymentMethod === 'SALDO_DEPOSIT' &&
                    (!selectedCustomer || (selectedCustomer.depositBalance || 0) < cartFinalTotal)
                  }
                  className={`w-full py-3 px-4 rounded-xl font-bold text-sm text-white shadow-md flex items-center justify-center gap-2 transition active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed ${
                    paymentMethod === 'KASBON'
                      ? 'bg-amber-600 hover:bg-amber-700'
                      : paymentMethod === 'SALDO_DEPOSIT'
                      ? 'bg-emerald-600 hover:bg-emerald-700'
                      : 'bg-blue-600 hover:bg-blue-700'
                  }`}
                >
                  <CheckCircle2 size={18} />
                  <span>
                    {paymentMethod === 'KASBON'
                      ? 'CATAT KASBON & SELESAI'
                      : paymentMethod === 'SALDO_DEPOSIT'
                      ? `POTONG SALDO (${formatRupiah(cartFinalTotal)})`
                      : `PROSES BAYAR (${formatRupiah(cartFinalTotal)})`}
                  </span>
                </button>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* 1. Modal Variant Selector */}
      {variantModalProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="p-4 bg-slate-900 text-white flex justify-between items-center">
              <div>
                <span className="text-xs text-emerald-400 font-semibold uppercase tracking-wide">
                  Pilih Varian & Tambahan
                </span>
                <h3 className="font-bold text-base text-white">{variantModalProduct.name}</h3>
                <p className="text-xs text-slate-300">Harga Dasar: {formatRupiah(variantModalProduct.basePrice)}</p>
              </div>
              <button
                onClick={() => setVariantModalProduct(null)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-4 space-y-3 max-h-[60vh] overflow-y-auto">
              <label className="block text-xs font-semibold text-slate-700">
                Pilih Varian / Topping / Level:
              </label>
              
              <div className="space-y-2">
                {variantModalProduct.variants.map(variant => {
                  const isChecked = selectedVariants.some(v => v.id === variant.id);
                  return (
                    <button
                      key={variant.id}
                      type="button"
                      onClick={() => toggleVariant(variant)}
                      className={`w-full p-3 rounded-xl border flex items-center justify-between text-left transition ${
                        isChecked
                          ? 'border-emerald-500 bg-emerald-50 text-emerald-950 font-semibold'
                          : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`w-5 h-5 rounded-md border flex items-center justify-center ${
                            isChecked
                              ? 'bg-emerald-600 border-emerald-600 text-white'
                              : 'border-slate-300 bg-white'
                          }`}
                        >
                          {isChecked && <CheckCircle2 size={13} />}
                        </div>
                        <span className="text-xs">{variant.name}</span>
                      </div>
                      <span className="text-xs font-mono text-emerald-700">
                        {variant.priceAdjustment > 0
                          ? `+${formatRupiah(variant.priceAdjustment)}`
                          : variant.priceAdjustment < 0
                          ? `-${formatRupiah(Math.abs(variant.priceAdjustment))}`
                          : 'Gratis'}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Item notes */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Catatan Khusus (misal: pedas sedang, pisahkan kuah):
                </label>
                <input
                  type="text"
                  placeholder="Catatan pesanan ini..."
                  value={variantNotes}
                  onChange={e => setVariantNotes(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Quantity */}
              <div className="flex items-center justify-between pt-2">
                <span className="text-xs font-semibold text-slate-700">Jumlah Porsi:</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setVariantQuantity(Math.max(1, variantQuantity - 1))}
                    className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center font-bold"
                  >
                    <Minus size={14} />
                  </button>
                  <span className="font-bold text-sm w-6 text-center">{variantQuantity}</span>
                  <button
                    onClick={() => setVariantQuantity(variantQuantity + 1)}
                    className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center font-bold"
                  >
                    <Plus size={14} />
                  </button>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-500 uppercase">Total per item:</span>
                <p className="font-bold text-sm text-emerald-800 font-mono">
                  {formatRupiah(
                    (variantModalProduct.basePrice +
                      selectedVariants.reduce((s, v) => s + v.priceAdjustment, 0)) *
                      variantQuantity
                  )}
                </p>
              </div>
              <button
                id="confirm-variant-btn"
                onClick={handleConfirmVariants}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs px-4 py-2.5 rounded-xl shadow-xs transition"
              >
                Tambahkan ke Keranjang
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Quick Customer Modal */}
      {showAddCustomerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full overflow-hidden border border-slate-200">
            <div className="p-4 bg-slate-900 text-white flex justify-between items-center">
              <h3 className="font-bold text-sm flex items-center gap-1.5">
                <UserPlus size={16} className="text-blue-400" /> Tambah Data Pelanggan Baru
              </h3>
              <button
                onClick={() => setShowAddCustomerModal(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSaveQuickCustomer} className="p-4 space-y-3">
              {/* Customer Type Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Kelompok Jenis Pelanggan *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewCustType('UMUM')}
                    className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
                      newCustType === 'UMUM'
                        ? 'bg-blue-50 border-blue-500 text-blue-800 shadow-2xs'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <User size={14} />
                    Pelanggan Umum
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewCustType('RESELLER')}
                    className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
                      newCustType === 'RESELLER'
                        ? 'bg-amber-50 border-amber-500 text-amber-900 shadow-2xs'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Store size={14} className="text-amber-600" />
                    Reseller / Mitra
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Nama Pelanggan / PIC *
                </label>
                <input
                  id="new-customer-name-input"
                  type="text"
                  required
                  placeholder="Contoh: Mas Agus (RT 02)"
                  value={newCustName}
                  onChange={e => setNewCustName(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Reseller Fields */}
              {newCustType === 'RESELLER' && (
                <div className="p-3 bg-amber-50/60 border border-amber-200 rounded-xl space-y-2.5">
                  <div>
                    <label className="block text-xs font-semibold text-amber-950 mb-1">
                      Nama Toko / Usaha Reseller (Opsional)
                    </label>
                    <input
                      type="text"
                      placeholder="Contoh: Warung Berkah Snack"
                      value={newCustStoreName}
                      onChange={e => setNewCustStoreName(e.target.value)}
                      className="w-full px-3 py-1.5 bg-white border border-amber-300 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-amber-950 mb-1">
                      Diskon Default Reseller
                    </label>
                    <div className="flex gap-2">
                      <div className="w-1/2">
                        <select
                          value={newCustDiscountType}
                          onChange={e => setNewCustDiscountType(e.target.value as DiscountType)}
                          className="w-full px-2.5 py-1.5 bg-white border border-amber-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-amber-500"
                        >
                          <option value="PERCENTAGE">% Persentase</option>
                          <option value="NOMINAL">Rp Nominal</option>
                        </select>
                      </div>
                      <div className="w-1/2">
                        <input
                          type="number"
                          min="0"
                          step={newCustDiscountType === 'PERCENTAGE' ? '1' : '1000'}
                          value={newCustDiscountValue || ''}
                          placeholder={newCustDiscountType === 'PERCENTAGE' ? '10%' : 'Rp 5.000'}
                          onChange={e => setNewCustDiscountValue(Number(e.target.value) || 0)}
                          className="w-full px-2.5 py-1.5 bg-white border border-amber-300 rounded-xl text-xs font-mono font-bold text-slate-900 focus:ring-2 focus:ring-amber-500"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Nomor WhatsApp *
                </label>
                <input
                  id="new-customer-phone-input"
                  type="tel"
                  required
                  placeholder="Contoh: 081298765432"
                  value={newCustPhone}
                  onChange={e => setNewCustPhone(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-xl text-xs font-mono focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Alamat / Catatan Rumah (Opsional)
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Rumah Biru Gang 3"
                  value={newCustAddress}
                  onChange={e => setNewCustAddress(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddCustomerModal(false)}
                  className="flex-1 px-3 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-medium hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  id="save-new-customer-btn"
                  type="submit"
                  className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-xl text-xs font-semibold hover:bg-blue-700 shadow-xs"
                >
                  Simpan & Pilih
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. Completed Transaction Receipt Modal */}
      {completedTransaction && (
        <ReceiptModal
          transaction={completedTransaction}
          storeSettings={storeSettings}
          onClose={() => setCompletedTransaction(null)}
        />
      )}
    </div>
  );
};
