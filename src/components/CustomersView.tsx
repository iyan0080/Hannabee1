import React, { useState, useMemo } from 'react';
import { useWarung } from '../context/WarungContext';
import { Customer, CustomerType, DiscountType } from '../types';
import {
  formatRupiah,
  formatDateOnly,
  formatDate,
  generateBillWhatsAppText,
  generatePromoWhatsAppText,
  generateTopUpReceiptWhatsAppText,
  openWhatsApp,
} from '../utils/format';
import { exportCustomersToExcel } from '../utils/exportData';
import { pickContactFromPhone, isContactPickerSupported } from '../utils/contactPicker';
import {
  Users,
  UserPlus,
  User,
  Search,
  FileSpreadsheet,
  MessageCircle,
  AlertCircle,
  CheckCircle2,
  Trash2,
  Edit2,
  Send,
  Sparkles,
  X,
  CreditCard,
  Phone,
  Wallet,
  History,
  ArrowDownRight,
  ArrowUpRight,
  PlusCircle,
  Receipt,
  Store,
  Tag,
  Percent,
  Award,
  Contact,
} from 'lucide-react';

export const CustomersView: React.FC = () => {
  const {
    customers,
    transactions,
    addCustomer,
    updateCustomer,
    deleteCustomer,
    settleCustomerDebt,
    topUpCustomerDeposit,
    storeSettings,
  } = useWarung();

  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'RESELLER' | 'UMUM'>('ALL');
  const [filterDebtOnly, setFilterDebtOnly] = useState(false);
  const [filterDepositOnly, setFilterDepositOnly] = useState(false);

  // Add / Edit Modal
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [customerType, setCustomerType] = useState<CustomerType>('UMUM');
  const [name, setName] = useState('');
  const [storeName, setStoreName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [resellerDiscountType, setResellerDiscountType] = useState<DiscountType>('PERCENTAGE');
  const [resellerDiscountValue, setResellerDiscountValue] = useState<number | ''>(10);
  const [initialDeposit, setInitialDeposit] = useState<number | ''>('');
  const [notes, setNotes] = useState('');
  const [contactPickerStatus, setContactPickerStatus] = useState<string | null>(null);

  // Handle Pick Contact from Phone
  const handlePickPhoneContact = async () => {
    setContactPickerStatus(null);
    const res = await pickContactFromPhone();
    if (res.success) {
      if (res.phone) {
        setPhone(res.phone);
      }
      if (res.name && !name.trim()) {
        setName(res.name);
      }
    } else if (res.message) {
      setContactPickerStatus(res.message);
      setTimeout(() => setContactPickerStatus(null), 6000);
    }
  };

  // Top Up Deposit Modal
  const [topUpCustomer, setTopUpCustomer] = useState<Customer | null>(null);
  const [topUpAmount, setTopUpAmount] = useState<number | ''>('');
  const [topUpMethod, setTopUpMethod] = useState<'TUNAI' | 'QRIS' | 'TRANSFER'>('TUNAI');
  const [topUpNotes, setTopUpNotes] = useState('');
  const [sendWaAfterTopUp, setSendWaAfterTopUp] = useState(true);

  // Deposit History Modal
  const [historyCustomer, setHistoryCustomer] = useState<Customer | null>(null);

  // WhatsApp Bill Modal
  const [billCustomer, setBillCustomer] = useState<Customer | null>(null);

  // WhatsApp Promo Modal
  const [promoCustomer, setPromoCustomer] = useState<Customer | null>(null);
  const [promoText, setPromoText] = useState(
    '🔥 Ada DISKON SPESIAL & MENU BARU di HannaBee hari ini!\nNikmati hidangan lezat dan segar dengan harga hemat. Yuk mampir atau pesan langsung via WA ini!'
  );
  const [promoAiLoading, setPromoAiLoading] = useState(false);

  // Settle Debt Modal
  const [settlingCustomer, setSettlingCustomer] = useState<Customer | null>(null);
  const [settleAmount, setSettleAmount] = useState<number | ''>('');
  const [settleNotes, setSettleNotes] = useState('');

  const filteredCustomers = useMemo(() => {
    return customers.filter(c => {
      const matchSearch =
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.phone.includes(searchQuery) ||
        (c.storeName && c.storeName.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (c.address && c.address.toLowerCase().includes(searchQuery.toLowerCase()));
      
      const matchType = 
        typeFilter === 'ALL' ||
        (typeFilter === 'RESELLER' && c.customerType === 'RESELLER') ||
        (typeFilter === 'UMUM' && c.customerType !== 'RESELLER');

      const matchDebt = !filterDebtOnly || c.totalDebt > 0;
      const matchDeposit = !filterDepositOnly || (c.customerType !== 'RESELLER' && (c.depositBalance || 0) > 0);
      return matchSearch && matchType && matchDebt && matchDeposit;
    });
  }, [customers, searchQuery, typeFilter, filterDebtOnly, filterDepositOnly]);

  const resellerCount = customers.filter(c => c.customerType === 'RESELLER').length;
  const umumCount = customers.filter(c => c.customerType !== 'RESELLER').length;
  const totalActiveDebt = customers.reduce((s, c) => s + (c.totalDebt || 0), 0);
  const totalDepositBalance = customers
    .filter(c => c.customerType !== 'RESELLER')
    .reduce((s, c) => s + (c.depositBalance || 0), 0);
  const umumWithDepositCount = customers.filter(
    c => c.customerType !== 'RESELLER' && (c.depositBalance || 0) > 0
  ).length;

  const openAddModal = () => {
    setEditingId(null);
    setCustomerType('UMUM');
    setName('');
    setStoreName('');
    setPhone('');
    setAddress('');
    setResellerDiscountType('PERCENTAGE');
    setResellerDiscountValue(10);
    setInitialDeposit('');
    setNotes('');
    setShowModal(true);
  };

  const openEditModal = (c: Customer) => {
    setEditingId(c.id);
    setCustomerType(c.customerType || 'UMUM');
    setName(c.name);
    setStoreName(c.storeName || '');
    setPhone(c.phone);
    setAddress(c.address || '');
    setResellerDiscountType(c.resellerDiscountType || 'PERCENTAGE');
    setResellerDiscountValue(c.resellerDiscountValue ?? 10);
    setInitialDeposit('');
    setNotes(c.notes || '');
    setShowModal(true);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    if (editingId) {
      updateCustomer(editingId, {
        customerType,
        name: name.trim(),
        storeName: customerType === 'RESELLER' ? storeName.trim() || undefined : undefined,
        phone: phone.trim(),
        address: address.trim() || undefined,
        resellerDiscountType: customerType === 'RESELLER' ? resellerDiscountType : undefined,
        resellerDiscountValue: customerType === 'RESELLER' ? Number(resellerDiscountValue) || 0 : undefined,
        depositBalance: customerType === 'RESELLER' ? 0 : undefined,
        notes: notes.trim() || undefined,
      });
    } else {
      addCustomer({
        customerType,
        name: name.trim(),
        storeName: customerType === 'RESELLER' ? storeName.trim() || undefined : undefined,
        phone: phone.trim(),
        address: address.trim() || undefined,
        resellerDiscountType: customerType === 'RESELLER' ? resellerDiscountType : undefined,
        resellerDiscountValue: customerType === 'RESELLER' ? Number(resellerDiscountValue) || 0 : undefined,
        depositBalance: customerType === 'UMUM' && Number(initialDeposit) > 0 ? Number(initialDeposit) : 0,
        notes: notes.trim() || undefined,
      });
    }

    setShowModal(false);
  };

  // Top-Up Submit
  const handleTopUpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!topUpCustomer || !topUpAmount || Number(topUpAmount) <= 0) return;

    const amount = Number(topUpAmount);
    const newBal = (topUpCustomer.depositBalance || 0) + amount;

    topUpCustomerDeposit(topUpCustomer.id, amount, topUpMethod, topUpNotes);

    if (sendWaAfterTopUp) {
      const msg = generateTopUpReceiptWhatsAppText(topUpCustomer, amount, newBal, topUpMethod, storeSettings);
      openWhatsApp(topUpCustomer.phone, msg);
    }

    setTopUpCustomer(null);
    setTopUpAmount('');
    setTopUpNotes('');
  };

  // Generate AI promo text
  const handleGenerateAiPromo = async () => {
    setPromoAiLoading(true);
    try {
      const res = await fetch('/api/ai/advisor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'promo',
          summary: { storeName: storeSettings.storeName },
          prompt: 'Buat pesan promosi diskon akhir pekan dan menu terlaris untuk pelanggan setia warung.',
        }),
      });
      const json = await res.json();
      if (json.content) {
        setPromoText(json.content);
      }
    } catch {
      setPromoText('🌟 Promo Spesial HannaBee!\nDapatkan diskon dan menu favorit hari ini. Pesan sekarang ya kak!');
    } finally {
      setPromoAiLoading(false);
    }
  };

  const handleSendBill = (c: Customer) => {
    const unpaidTrx = transactions.filter(t => t.customerId === c.id && t.status === 'BELUM_LUNAS');
    const msg = generateBillWhatsAppText(c, unpaidTrx, storeSettings);
    openWhatsApp(c.phone, msg);
    setBillCustomer(null);
  };

  const handleSendPromo = (c: Customer) => {
    const msg = generatePromoWhatsAppText(c.name, promoText, storeSettings);
    openWhatsApp(c.phone, msg);
    setPromoCustomer(null);
  };

  const handleSettleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!settlingCustomer || !settleAmount || Number(settleAmount) <= 0) return;
    settleCustomerDebt(settlingCustomer.id, Number(settleAmount), settleNotes);
    setSettlingCustomer(null);
    setSettleAmount('');
    setSettleNotes('');
  };

  return (
    <div className="max-w-7xl mx-auto p-3 sm:p-5 space-y-5">
      {/* Header with Geometric Balance Layout */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-blue-100 text-blue-800 flex items-center justify-center font-bold">
              👥
            </span>
            <h2 className="text-base sm:text-lg font-bold text-slate-900">
              Database Pelanggan & Reseller
            </h2>
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 mt-1.5">
            <span>Total <b>{customers.length}</b> Pelanggan</span>
            <span className="text-slate-300">•</span>
            <span className="text-amber-800 font-semibold">⭐ <b>{resellerCount}</b> Reseller</span>
            <span className="text-slate-300">•</span>
            <span className="text-slate-700 font-semibold">👤 <b>{umumCount}</b> Umum</span>
            <span className="text-slate-300">•</span>
            <span>
              Titipan Saldo (Umum):{' '}
              <span className="font-bold text-emerald-700 font-mono">{formatRupiah(totalDepositBalance)}</span>
            </span>
            <span className="text-slate-300">•</span>
            <span>
              Kasbon:{' '}
              <span className="font-bold text-amber-700 font-mono">{formatRupiah(totalActiveDebt)}</span>
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            id="export-customers-excel-btn"
            onClick={() => exportCustomersToExcel(filteredCustomers, storeSettings)}
            className="px-3.5 py-2 bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs transition"
          >
            <FileSpreadsheet size={15} className="text-slate-600" />
            <span>Ekspor Excel</span>
          </button>

          <button
            id="open-add-customer-modal-btn"
            onClick={openAddModal}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs transition"
          >
            <UserPlus size={16} />
            <span>+ Tambah Pelanggan</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              id="customer-search-input"
              type="text"
              placeholder="Cari nama pelanggan, toko reseller, nomor WA, alamat..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
            <button
              onClick={() => setFilterDepositOnly(!filterDepositOnly)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition whitespace-nowrap flex items-center gap-1.5 ${
                filterDepositOnly
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <Wallet size={14} />
              <span>Ada Saldo Deposit ({umumWithDepositCount})</span>
            </button>

            <button
              onClick={() => setFilterDebtOnly(!filterDebtOnly)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition whitespace-nowrap flex items-center gap-1.5 ${
                filterDebtOnly
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <AlertCircle size={14} />
              <span>Ada Kasbon ({customers.filter(c => c.totalDebt > 0).length})</span>
            </button>
          </div>
        </div>

        {/* Customer Type Category Tabs */}
        <div className="flex items-center gap-2 border-t border-slate-100 pt-2.5 overflow-x-auto">
          <span className="text-xs font-semibold text-slate-500 whitespace-nowrap">Kategori:</span>
          <button
            onClick={() => setTypeFilter('ALL')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition whitespace-nowrap ${
              typeFilter === 'ALL'
                ? 'bg-blue-600 text-white shadow-2xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Semua ({customers.length})
          </button>
          <button
            onClick={() => setTypeFilter('RESELLER')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition whitespace-nowrap flex items-center gap-1 ${
              typeFilter === 'RESELLER'
                ? 'bg-amber-600 text-white shadow-2xs'
                : 'bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100'
            }`}
          >
            <Store size={13} />
            <span>⭐ Pelanggan Reseller ({resellerCount})</span>
          </button>
          <button
            onClick={() => setTypeFilter('UMUM')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition whitespace-nowrap flex items-center gap-1 ${
              typeFilter === 'UMUM'
                ? 'bg-slate-800 text-white shadow-2xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <User size={13} />
            <span>👤 Pelanggan Umum ({umumCount})</span>
          </button>
        </div>
      </div>

      {/* Customers Cards & Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredCustomers.map(customer => {
          const hasDebt = customer.totalDebt > 0;
          const depositBal = customer.depositBalance || 0;
          const isReseller = customer.customerType === 'RESELLER';

          return (
            <div
              key={customer.id}
              className={`bg-white rounded-2xl border p-4 shadow-xs flex flex-col justify-between transition ${
                isReseller
                  ? 'border-amber-300 ring-1 ring-amber-200/50 bg-linear-to-b from-amber-50/20 to-white'
                  : hasDebt
                  ? 'border-red-300'
                  : 'border-slate-200'
              }`}
            >
              <div>
                {/* Header Profile & Badge */}
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h4 className="font-bold text-sm text-slate-900">{customer.name}</h4>
                      {isReseller ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1">
                          <Store size={11} className="text-amber-700" /> RESELLER
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                          UMUM
                        </span>
                      )}
                    </div>

                    {customer.storeName && (
                      <p className="text-xs text-amber-900 font-semibold flex items-center gap-1 mt-0.5">
                        <Store size={12} className="text-amber-700" />
                        <span>{customer.storeName}</span>
                      </p>
                    )}

                    <p className="text-xs text-blue-600 font-mono flex items-center gap-1 mt-0.5">
                      <Phone size={11} />
                      {customer.phone}
                    </p>
                  </div>

                  <div className="flex flex-col items-end gap-1">
                    {hasDebt && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-800 border border-red-200">
                        Bon: {formatRupiah(customer.totalDebt)}
                      </span>
                    )}
                  </div>
                </div>

                {/* Reseller Discount Rule Banner */}
                {isReseller && (
                  <div className="mb-2 px-2.5 py-1.5 rounded-xl bg-amber-50 border border-amber-200/80 flex items-center justify-between text-xs text-amber-950">
                    <span className="flex items-center gap-1 text-[11px] font-medium text-amber-800">
                      <Tag size={12} className="text-amber-600" /> Diskon Reseller:
                    </span>
                    <span className="font-bold font-mono text-amber-900 bg-amber-200/70 px-2 py-0.5 rounded-lg text-[11px]">
                      {customer.resellerDiscountType === 'PERCENTAGE'
                        ? `${customer.resellerDiscountValue || 0}% Persen`
                        : `${formatRupiah(customer.resellerDiscountValue || 0)} Nominal`}
                    </span>
                  </div>
                )}

                {customer.address && (
                  <p className="text-[11px] text-slate-500 mb-2 line-clamp-1">📍 {customer.address}</p>
                )}

                {/* Saldo Deposit (Khusus Pelanggan Umum) & Spending Card */}
                <div className="my-2 space-y-1.5">
                  {/* Deposit Balance Box - Khusus Pelanggan Umum */}
                  {!isReseller && (
                    <div className="p-2.5 rounded-xl bg-emerald-50/70 border border-emerald-200/80 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-emerald-800 font-semibold flex items-center gap-1">
                          <Wallet size={12} className="text-emerald-600" /> SALDO DEPOSIT
                        </span>
                        <span className="text-sm font-bold text-emerald-950 font-mono">
                          {formatRupiah(depositBal)}
                        </span>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            setTopUpCustomer(customer);
                            setTopUpAmount('');
                          }}
                          className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-semibold flex items-center gap-1 shadow-xs transition"
                          title="Top-Up Saldo Pelanggan Umum"
                        >
                          <PlusCircle size={12} />
                          <span>Top-Up</span>
                        </button>

                        <button
                          onClick={() => setHistoryCustomer(customer)}
                          className="p-1 text-emerald-800 hover:bg-emerald-100 rounded-lg transition"
                          title="Lihat Riwayat Mutasi Saldo"
                        >
                          <History size={14} />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Spending stats */}
                  <div className="grid grid-cols-2 gap-2 p-2 rounded-xl bg-slate-50 border border-slate-100 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 font-semibold block">TOTAL TRANSAKSI</span>
                      <span className="font-bold text-slate-800">{customer.totalTransactions} Kali</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-semibold block">TOTAL BELANJA</span>
                      <span className="font-bold text-slate-900 font-mono">{formatRupiah(customer.totalSpent)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* WhatsApp Quick Actions */}
              <div className="pt-3 border-t border-slate-100 space-y-2">
                <div className="flex items-center gap-1.5">
                  {/* WhatsApp Tagihan Bon */}
                  {hasDebt && (
                    <button
                      id={`tagih-wa-${customer.id}`}
                      onClick={() => handleSendBill(customer)}
                      className="flex-1 px-2.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1 shadow-xs transition"
                      title="Kirim Rincian Tagihan Kasbon ke WhatsApp"
                    >
                      <MessageCircle size={13} />
                      <span>Tagih Bon</span>
                    </button>
                  )}

                  {/* WhatsApp Promosi */}
                  <button
                    id={`promo-wa-${customer.id}`}
                    onClick={() => setPromoCustomer(customer)}
                    className="flex-1 px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1 shadow-xs transition"
                    title="Kirim Pesan Promo WhatsApp"
                  >
                    <Send size={13} />
                    <span>Kirim Promo WA</span>
                  </button>
                </div>

                {/* Secondary tools */}
                <div className="flex items-center justify-between pt-1">
                  {hasDebt ? (
                    <button
                      onClick={() => {
                        setSettlingCustomer(customer);
                        setSettleAmount(customer.totalDebt);
                      }}
                      className="text-xs text-amber-700 hover:text-amber-900 font-semibold"
                    >
                      + Bayar Kasbon
                    </button>
                  ) : (
                    <span className="text-[11px] text-slate-400">Status rapi</span>
                  )}

                  <div className="flex items-center gap-1 ml-auto">
                    <button
                      onClick={() => openEditModal(customer)}
                      className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition"
                      title="Edit Data"
                    >
                      <Edit2 size={13} />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`Hapus data pelanggan "${customer.name}"?`)) {
                          deleteCustomer(customer.id);
                        }
                      }}
                      className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition"
                      title="Hapus Pelanggan"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filteredCustomers.length === 0 && (
        <div className="bg-white rounded-2xl p-10 text-center border border-slate-200 shadow-xs">
          <p className="text-sm text-slate-500">Tidak ada pelanggan yang cocok dengan filter atau kata kunci.</p>
        </div>
      )}

      {/* 1. TOP-UP DEPOSIT MODAL */}
      {topUpCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full overflow-hidden border border-slate-200">
            <div className="p-4 bg-slate-900 text-white flex justify-between items-center">
              <div className="flex items-center gap-2">
                <span className="p-1 bg-emerald-500/20 text-emerald-400 rounded-lg">
                  <Wallet size={16} />
                </span>
                <div>
                  <h3 className="font-bold text-sm">Top-Up Saldo Pelanggan</h3>
                  <p className="text-[11px] text-slate-300">{topUpCustomer.name} ({topUpCustomer.phone})</p>
                </div>
              </div>
              <button onClick={() => setTopUpCustomer(null)} className="text-slate-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleTopUpSubmit} className="p-4 space-y-3.5 text-xs">
              {/* Current balance display */}
              <div className="bg-emerald-50 p-2.5 rounded-xl border border-emerald-200 flex justify-between items-center">
                <span className="text-slate-700 font-medium">Saldo Saat Ini:</span>
                <span className="font-bold text-sm text-emerald-900 font-mono">
                  {formatRupiah(topUpCustomer.depositBalance || 0)}
                </span>
              </div>

              {/* Fast amount buttons */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1.5">Pilihan Cepat Nominal:</label>
                <div className="grid grid-cols-3 gap-1.5">
                  {[20000, 50000, 100000, 150000, 200000, 500000].map(amt => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setTopUpAmount(amt)}
                      className={`py-1.5 px-2 rounded-lg text-xs font-semibold border transition ${
                        topUpAmount === amt
                          ? 'bg-emerald-600 border-emerald-600 text-white shadow-xs'
                          : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {formatRupiah(amt)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Manual Input */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Nominal Top-Up (Rp) *
                </label>
                <input
                  id="topup-amount-input"
                  type="number"
                  required
                  min="1000"
                  step="1000"
                  placeholder="Contoh: 50000"
                  value={topUpAmount}
                  onChange={e => setTopUpAmount(Number(e.target.value) || '')}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono font-bold text-slate-900 text-sm focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Payment Method for Top-Up */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Metode Penerimaan Uang:
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {(['TUNAI', 'QRIS', 'TRANSFER'] as ('TUNAI' | 'QRIS' | 'TRANSFER')[]).map(m => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setTopUpMethod(m)}
                      className={`py-1.5 rounded-lg text-xs font-semibold border transition ${
                        topUpMethod === m
                          ? 'bg-blue-600 border-blue-600 text-white shadow-xs'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              {/* Top-up notes */}
              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Catatan / Keterangan (Opsional)
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Titip uang mingguan untuk jajan anak"
                  value={topUpNotes}
                  onChange={e => setTopUpNotes(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-xl text-xs"
                />
              </div>

              {/* WA Send Checkbox */}
              <label className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={sendWaAfterTopUp}
                  onChange={e => setSendWaAfterTopUp(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500"
                />
                <span className="text-xs text-slate-700 font-medium">
                  Kirim Bukti Struk Top-Up via WhatsApp otomatis
                </span>
              </label>

              {/* Result Preview */}
              {Number(topUpAmount) > 0 && (
                <div className="p-2 rounded-lg bg-emerald-50/50 border border-emerald-100 flex justify-between text-xs">
                  <span className="text-emerald-900">Total Saldo Setelah Top-Up:</span>
                  <span className="font-bold font-mono text-emerald-800">
                    {formatRupiah((topUpCustomer.depositBalance || 0) + Number(topUpAmount))}
                  </span>
                </div>
              )}

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setTopUpCustomer(null)}
                  className="flex-1 px-3 py-2 border border-slate-200 text-slate-600 rounded-xl font-medium"
                >
                  Batal
                </button>
                <button
                  id="confirm-topup-btn"
                  type="submit"
                  className="flex-1 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold flex items-center justify-center gap-1.5 shadow-xs"
                >
                  <CheckCircle2 size={15} />
                  <span>Simpan Top-Up</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. DEPOSIT HISTORY MODAL */}
      {historyCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full overflow-hidden border border-slate-200">
            <div className="p-4 bg-slate-900 text-white flex justify-between items-center">
              <div>
                <h3 className="font-bold text-sm flex items-center gap-1.5">
                  <History size={16} className="text-emerald-400" />
                  Riwayat Mutasi Saldo Deposit
                </h3>
                <p className="text-xs text-slate-400">{historyCustomer.name} ({historyCustomer.phone})</p>
              </div>
              <button onClick={() => setHistoryCustomer(null)} className="text-slate-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <div className="p-4 space-y-3 text-xs max-h-[70vh] overflow-y-auto">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-500 font-semibold block">SALDO AKTIF SAAT INI</span>
                  <span className="text-base font-bold text-emerald-800 font-mono">
                    {formatRupiah(historyCustomer.depositBalance || 0)}
                  </span>
                </div>
                <button
                  onClick={() => {
                    const cust = historyCustomer;
                    setHistoryCustomer(null);
                    setTopUpCustomer(cust);
                  }}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1"
                >
                  <PlusCircle size={13} />
                  <span>+ Top Up Saldo</span>
                </button>
              </div>

              <div className="space-y-2">
                <h5 className="font-semibold text-slate-700 text-[11px] uppercase tracking-wider">
                  Log Transaksi Saldo ({historyCustomer.depositHistory?.length || 0})
                </h5>

                {!historyCustomer.depositHistory || historyCustomer.depositHistory.length === 0 ? (
                  <div className="text-center py-6 text-slate-400">
                    <p>Belum ada riwayat transaksi deposit untuk pelanggan ini.</p>
                  </div>
                ) : (
                  [...historyCustomer.depositHistory].reverse().map(record => {
                    const isTopUp = record.type === 'TOP_UP';
                    return (
                      <div
                        key={record.id}
                        className={`p-3 rounded-xl border flex items-start justify-between ${
                          isTopUp ? 'bg-emerald-50/40 border-emerald-100' : 'bg-slate-50 border-slate-200'
                        }`}
                      >
                        <div className="flex items-start gap-2.5">
                          <div
                            className={`w-7 h-7 rounded-lg flex items-center justify-center mt-0.5 ${
                              isTopUp ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-700'
                            }`}
                          >
                            {isTopUp ? <ArrowDownRight size={15} /> : <ArrowUpRight size={15} />}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-800">
                              {isTopUp ? 'Top-Up Saldo' : 'Pembayaran Pesanan (POS)'}
                            </p>
                            <p className="text-[10px] text-slate-400">{formatDate(record.timestamp)}</p>
                            {record.notes && (
                              <p className="text-[11px] text-slate-500 italic mt-0.5">{record.notes}</p>
                            )}
                            <p className="text-[10px] text-slate-400 mt-0.5">
                              Sisa Saldo: <span className="font-mono font-bold text-slate-700">{formatRupiah(record.balanceAfter)}</span>
                            </p>
                          </div>
                        </div>

                        <div className="text-right">
                          <span
                            className={`font-mono font-bold text-sm block ${
                              isTopUp ? 'text-emerald-700' : 'text-red-600'
                            }`}
                          >
                            {isTopUp ? `+${formatRupiah(record.amount)}` : `-${formatRupiah(record.amount)}`}
                          </span>
                          {record.paymentMethod && (
                            <span className="text-[10px] text-slate-400 uppercase">
                              via {record.paymentMethod}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <div className="p-3 border-t border-slate-200 bg-slate-50 flex justify-end">
              <button
                onClick={() => setHistoryCustomer(null)}
                className="px-4 py-1.5 bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Add / Edit Customer Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden border border-slate-200">
            <div className="p-4 bg-slate-900 text-white flex justify-between items-center">
              <h3 className="font-bold text-sm flex items-center gap-1.5">
                <UserPlus size={16} className="text-blue-400" />
                {editingId ? 'Edit Data Pelanggan / Reseller' : 'Tambah Pelanggan / Reseller Baru'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="p-4 space-y-3 text-xs max-h-[80vh] overflow-y-auto">
              {/* Customer Type Selector */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Kelompok Jenis Pelanggan *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setCustomerType('UMUM')}
                    className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
                      customerType === 'UMUM'
                        ? 'bg-blue-50 border-blue-500 text-blue-800 shadow-2xs'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <User size={14} />
                    Pelanggan Umum
                  </button>
                  <button
                    type="button"
                    onClick={() => setCustomerType('RESELLER')}
                    className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
                      customerType === 'RESELLER'
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
                <label className="block font-medium text-slate-700 mb-1">
                  Nama Pelanggan / PIC *
                </label>
                <input
                  id="cust-name-input"
                  type="text"
                  required
                  placeholder="Contoh: Bu Anita / Mas Dimas"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 font-semibold"
                />
              </div>

              {/* Reseller Extra Fields */}
              {customerType === 'RESELLER' && (
                <div className="p-3 bg-amber-50/60 border border-amber-200 rounded-xl space-y-2.5">
                  <div>
                    <label className="block font-semibold text-amber-950 mb-1">
                      Nama Toko / Usaha Reseller (Opsional)
                    </label>
                    <input
                      type="text"
                      placeholder="Contoh: Warung Berkah Snack / Toko Bu Anita"
                      value={storeName}
                      onChange={e => setStoreName(e.target.value)}
                      className="w-full px-3 py-1.5 bg-white border border-amber-300 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-amber-950 mb-1">
                      Potongan Diskon Otomatis Reseller
                    </label>
                    <div className="flex gap-2">
                      <div className="w-1/2">
                        <select
                          value={resellerDiscountType}
                          onChange={e => setResellerDiscountType(e.target.value as DiscountType)}
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
                          step={resellerDiscountType === 'PERCENTAGE' ? '1' : '1000'}
                          value={resellerDiscountValue}
                          placeholder={resellerDiscountType === 'PERCENTAGE' ? '10%' : 'Rp 5.000'}
                          onChange={e => setResellerDiscountValue(Number(e.target.value) || '')}
                          className="w-full px-2.5 py-1.5 bg-white border border-amber-300 rounded-xl text-xs font-mono font-bold text-slate-900 focus:ring-2 focus:ring-amber-500"
                        />
                      </div>
                    </div>
                    <p className="text-[10px] text-amber-800 mt-1">
                      * Diskon ini akan otomatis diterapkan saat pelanggan reseller dipilih di Kasir (POS).
                    </p>
                  </div>
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block font-medium text-slate-700">
                    Nomor WhatsApp (Opsional)
                  </label>
                  <button
                    type="button"
                    onClick={handlePickPhoneContact}
                    className="text-xs text-blue-600 hover:text-blue-800 hover:bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-200 flex items-center gap-1 font-semibold transition active:scale-95 shadow-2xs"
                    title="Buka daftar kontak buku telepon HP Anda"
                  >
                    <Contact size={14} className="text-blue-600" />
                    <span>Cari Kontak HP</span>
                  </button>
                </div>
                <input
                  id="cust-phone-input"
                  type="tel"
                  placeholder="Contoh: 081298765432 (Boleh kosong)"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-xl font-mono focus:ring-2 focus:ring-blue-500"
                />
                {contactPickerStatus && (
                  <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-1.5 mt-1">
                    ℹ️ {contactPickerStatus}
                  </p>
                )}
              </div>

              {!editingId && customerType === 'UMUM' && (
                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    Saldo Awal Titipan Deposit (Opsional)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    placeholder="Contoh: 50000 (jika langsung titip deposit)"
                    value={initialDeposit}
                    onChange={e => setInitialDeposit(Number(e.target.value) || '')}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-xl font-mono"
                  />
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Fitur titipan saldo deposit khusus untuk Pelanggan Umum.
                  </p>
                </div>
              )}

              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Alamat / Patokan Rumah
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Jl. Melati No. 5 RT 02"
                  value={address}
                  onChange={e => setAddress(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Catatan Khusus (Opsional)
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Pengambilan rutin tiap hari Senin & Kamis"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-xl"
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-3 py-2 border border-slate-200 text-slate-600 rounded-xl font-medium hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  id="save-customer-btn"
                  type="submit"
                  className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow-xs"
                >
                  {editingId ? 'Simpan Perubahan' : 'Tambah Pelanggan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. WhatsApp Promo Modal */}
      {promoCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden border border-slate-200">
            <div className="p-4 bg-slate-900 text-white flex justify-between items-center">
              <div>
                <h3 className="font-bold text-sm">Kirim Promosi WhatsApp</h3>
                <p className="text-xs text-slate-400">Kepada: {promoCustomer.name} ({promoCustomer.phone})</p>
              </div>
              <button onClick={() => setPromoCustomer(null)} className="text-slate-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <div className="p-4 space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <label className="font-semibold text-slate-700">Teks Isi Pesan Promosi:</label>
                <button
                  onClick={handleGenerateAiPromo}
                  disabled={promoAiLoading}
                  className="text-blue-600 hover:text-blue-700 font-bold flex items-center gap-1"
                >
                  <Sparkles size={13} />
                  <span>{promoAiLoading ? 'Membuat...' : 'Buat dengan AI'}</span>
                </button>
              </div>

              <textarea
                rows={5}
                value={promoText}
                onChange={e => setPromoText(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-blue-500"
              />

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setPromoCustomer(null)}
                  className="flex-1 px-3 py-2 border border-slate-200 text-slate-600 rounded-xl font-medium"
                >
                  Batal
                </button>
                <button
                  onClick={() => handleSendPromo(promoCustomer)}
                  className="flex-1 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl flex items-center justify-center gap-1.5 shadow-xs"
                >
                  <MessageCircle size={15} />
                  <span>Buka WhatsApp</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5. Settle Debt Modal */}
      {settlingCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full overflow-hidden border border-slate-200">
            <div className="p-4 bg-slate-900 text-white flex justify-between items-center">
              <h3 className="font-bold text-sm">Pelunasan Kasbon Pelanggan</h3>
              <button onClick={() => setSettlingCustomer(null)} className="text-slate-400 hover:text-white">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSettleSubmit} className="p-4 space-y-3 text-xs">
              <div className="bg-amber-50 p-3 rounded-xl border border-amber-200">
                <div className="flex justify-between text-slate-700">
                  <span>Pelanggan:</span>
                  <span className="font-bold">{settlingCustomer.name}</span>
                </div>
                <div className="flex justify-between text-amber-900 font-bold mt-1">
                  <span>Sisa Kasbon Saat Ini:</span>
                  <span className="font-mono text-sm">{formatRupiah(settlingCustomer.totalDebt)}</span>
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Nominal Pembayaran (Rp) *
                </label>
                <input
                  type="number"
                  required
                  min="500"
                  step="500"
                  value={settleAmount}
                  onChange={e => setSettleAmount(Number(e.target.value) || '')}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono font-bold text-slate-900"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Catatan Pelunasan
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Bayar lunas tunai di warung"
                  value={settleNotes}
                  onChange={e => setSettleNotes(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-xl"
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setSettlingCustomer(null)}
                  className="flex-1 px-3 py-2 border border-slate-200 text-slate-600 rounded-xl font-medium"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold"
                >
                  Simpan Pelunasan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
