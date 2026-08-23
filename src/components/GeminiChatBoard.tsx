import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useWarung } from '../context/WarungContext';
import { GeminiChatMessage, GeminiChatBoardNote } from '../types';
import {
  Sparkles,
  Bot,
  Send,
  Copy,
  Check,
  Share2,
  Pin,
  Trash2,
  Plus,
  RefreshCw,
  MessageSquare,
  LayoutGrid,
  Wand2,
  TrendingUp,
  ShoppingCart,
  Users,
  DollarSign,
  Utensils,
  AlertCircle,
  Search,
  Flame,
  ArrowRight,
  UserCheck,
  CheckCircle2,
  FileText,
  Clock,
  ChevronRight,
  MessageCircle,
} from 'lucide-react';

const STORAGE_CHAT_KEY = 'hannabee_gemini_chat_history_v1';
const STORAGE_BOARD_KEY = 'hannabee_gemini_board_notes_v1';

export const GeminiChatBoard: React.FC = () => {
  const {
    products,
    transactions,
    customers,
    expenses,
    shoppingItems,
    storeSettings,
    currentUser,
    calculateProfitLoss,
  } = useWarung();

  // Active sub-tab in Gemini Board: 'chat' | 'board' | 'tools'
  const [activeBoardTab, setActiveBoardTab] = useState<'chat' | 'board' | 'tools'>('chat');

  // Chat State
  const [messages, setMessages] = useState<GeminiChatMessage[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_CHAT_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error('Failed to parse gemini chat history', e);
    }
    return [
      {
        id: 'msg-welcome',
        role: 'assistant',
        content: `Halo ${currentUser?.name || 'Kak'}! 👋 Saya **Gemini Business AI** untuk **${storeSettings.name || 'HannaBee'}**.\n\nSaya telah terhubung langsung dengan data penjualan harian, stok menu, buku kas, dan kasbon warung Anda. Apa yang ingin Anda diskusikan atau analisis hari ini?`,
        timestamp: new Date().toISOString(),
        modelUsed: 'gemini-3.7-flash',
      },
    ];
  });

  const [inputPrompt, setInputPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [pinnedSuccessId, setPinnedSuccessId] = useState<string | null>(null);

  // Board Notes State
  const [boardNotes, setBoardNotes] = useState<GeminiChatBoardNote[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_BOARD_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error('Failed to parse gemini board notes', e);
    }
    return [
      {
        id: 'note-welcome-1',
        title: '🌟 Strategi Bundling Jam Ramai',
        content: 'Paket "Wareg Seger": Gabungkan 1 menu makanan berat favorit + 1 minuman signature dengan potongan diskon Rp 2.000 untuk meningkatkan Average Order Value (AOV).',
        category: 'STRATEGY',
        createdAt: new Date().toISOString(),
        tags: ['Bundling', 'AOV', 'Promo'],
      },
      {
        id: 'note-welcome-2',
        title: '📢 Template Broadcast WhatsApp Akhir Pekan',
        content: '🔥 *PROMO SPESIAL AKHIR PEKAN HANNABEE!* 🔥\n\nHalo Sahabat HannaBee! Weekend ini makin seru ditemani Jajanan Wareg Seger kami.\nYuk pesan menu favoritmu sekarang via WhatsApp ini, langsung kami siapkan fresh & higienis! 🙏✨',
        category: 'PROMO',
        createdAt: new Date().toISOString(),
        tags: ['WhatsApp', 'Promo', 'Weekend'],
      },
    ];
  });

  // Board Filters & Modals
  const [boardCategoryFilter, setBoardCategoryFilter] = useState<string>('ALL');
  const [boardSearchQuery, setBoardSearchQuery] = useState<string>('');
  const [showAddNoteModal, setShowAddNoteModal] = useState(false);
  const [newNoteTitle, setNewNoteTitle] = useState('');
  const [newNoteContent, setNewNoteContent] = useState('');
  const [newNoteCategory, setNewNoteCategory] = useState<GeminiChatBoardNote['category']>('STRATEGY');

  // Smart Tool States
  const [toolPromoTarget, setToolPromoTarget] = useState<'all' | 'loyal' | 'weekend' | 'new_menu'>('all');
  const [toolPromoHighlight, setToolPromoHighlight] = useState('');
  const [toolPromoDiscount, setToolPromoDiscount] = useState('Diskon 10%');
  const [toolKasbonCustomerId, setToolKasbonCustomerId] = useState('');
  const [toolHppMenuName, setToolHppMenuName] = useState('');
  const [toolHppCost, setToolHppCost] = useState('');
  const [toolHppTargetMargin, setToolHppTargetMargin] = useState('40');

  const chatEndRef = useRef<HTMLDivElement>(null);

  // Save chat history to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_CHAT_KEY, JSON.stringify(messages));
    } catch (e) {
      console.error('Failed to save chat history', e);
    }
  }, [messages]);

  // Save board notes to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_BOARD_KEY, JSON.stringify(boardNotes));
    } catch (e) {
      console.error('Failed to save board notes', e);
    }
  }, [boardNotes]);

  // Auto scroll chat
  useEffect(() => {
    if (activeBoardTab === 'chat') {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, activeBoardTab, isLoading]);

  // Context Metrics Grounding for AI
  const storeContextData = useMemo(() => {
    const today = new Date();
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0);
    const endOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);

    const todayTrx = transactions.filter(t => {
      const d = new Date(t.date);
      return d >= startOfToday && d <= endOfToday && t.status !== 'BATAL';
    });

    const todayRevenue = todayTrx.reduce((sum, t) => sum + (t.finalAmount || t.totalAmount || 0), 0);
    const todayGrossProfit = todayTrx.reduce((sum, t) => sum + (t.grossProfit || 0), 0);

    // Month to date summary
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const plMonth = calculateProfitLoss(startOfMonth, today, 'Bulan Ini');

    // Product sales count
    const productSalesMap: { [id: string]: { name: string; qty: number; revenue: number } } = {};
    transactions.forEach(t => {
      if (t.status === 'BATAL') return;
      t.items.forEach(item => {
        if (!productSalesMap[item.productId]) {
          productSalesMap[item.productId] = { name: item.productName, qty: 0, revenue: 0 };
        }
        productSalesMap[item.productId].qty += item.quantity;
        productSalesMap[item.productId].revenue += item.subtotal;
      });
    });

    const topProducts = Object.values(productSalesMap)
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5)
      .map(p => ({ name: p.name, qtySold: p.qty, revenue: p.revenue }));

    const lowStockProducts = products
      .filter(p => p.stock <= 5 && !p.isArchived)
      .map(p => ({ name: p.name, stock: p.stock, unit: p.unit }));

    const unpaidTransactions = transactions.filter(t => t.status === 'BELUM_LUNAS');
    const totalUnpaid = unpaidTransactions.reduce((sum, t) => sum + (t.remainingUnpaid || 0), 0);

    const totalCustomerDeposits = customers.reduce((sum, c) => sum + (c.depositBalance || 0), 0);

    const pendingShopping = shoppingItems.filter(s => s.status !== 'PURCHASED');
    const totalShoppingBudget = pendingShopping.reduce((sum, s) => sum + (s.estimatedCost || 0), 0);

    return {
      storeName: storeSettings.name || 'HannaBee Jajanan Wareg Seger',
      todaySalesSummary: {
        totalRevenue: todayRevenue,
        grossProfit: todayGrossProfit,
        transactionCount: todayTrx.length,
      },
      monthSummary: {
        totalSales: plMonth.totalSales,
        totalExpenses: plMonth.totalExpenses,
        netProfit: plMonth.netProfit,
        marginPercent: plMonth.netProfitMargin,
      },
      topProducts,
      lowStockProducts,
      unpaidKasbonSummary: {
        totalUnpaid,
        count: unpaidTransactions.length,
      },
      activeCustomersCount: customers.length,
      totalCustomerDeposits,
      shoppingListSummary: {
        pendingCount: pendingShopping.length,
        totalBudget: totalShoppingBudget,
      },
    };
  }, [products, transactions, customers, expenses, shoppingItems, storeSettings, calculateProfitLoss]);

  // Send Message to Gemini AI
  const handleSendMessage = async (customText?: string, actionType?: string) => {
    const textToSend = customText || inputPrompt;
    if (!textToSend.trim() && !actionType) return;

    const userMsgId = `user-${Date.now()}`;
    const userMessage: GeminiChatMessage = {
      id: userMsgId,
      role: 'user',
      content: textToSend.trim() || `Tolong proses rekomendasi ${actionType}`,
      timestamp: new Date().toISOString(),
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInputPrompt('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages.map(m => ({ role: m.role, content: m.content })),
          context: storeContextData,
          action: actionType || 'chat',
          customPrompt: textToSend,
        }),
      });

      const data = await response.json();

      if (data.success && data.content) {
        const assistantMessage: GeminiChatMessage = {
          id: `ai-${Date.now()}`,
          role: 'assistant',
          content: data.content,
          timestamp: new Date().toISOString(),
          modelUsed: data.modelUsed || 'gemini-3.7-flash',
        };
        setMessages(prev => [...prev, assistantMessage]);
      } else {
        const errorMsg: GeminiChatMessage = {
          id: `err-${Date.now()}`,
          role: 'assistant',
          content: `⚠️ Maaf, terjadi kendala saat menghubungi Gemini AI: ${data.error || 'Silakan periksa koneksi atau coba lagi.'}`,
          timestamp: new Date().toISOString(),
          isError: true,
        };
        setMessages(prev => [...prev, errorMsg]);
      }
    } catch (err: any) {
      console.error('Chat error:', err);
      const errorMsg: GeminiChatMessage = {
        id: `err-${Date.now()}`,
        role: 'assistant',
        content: `⚠️ Gagal terhubung ke server AI: ${err.message || 'Koneksi terputus'}.`,
        timestamp: new Date().toISOString(),
        isError: true,
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  // Copy text helper
  const handleCopyText = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Share to WhatsApp helper
  const handleShareWhatsApp = (text: string, phone?: string) => {
    const cleanPhone = phone ? phone.replace(/[^0-9]/g, '') : '';
    const formattedPhone = cleanPhone.startsWith('0') ? '62' + cleanPhone.slice(1) : cleanPhone;
    const url = formattedPhone
      ? `https://wa.me/${formattedPhone}?text=${encodeURIComponent(text)}`
      : `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  // Pin chat message to Board Notes
  const handlePinToBoard = (msg: GeminiChatMessage) => {
    const lines = msg.content.split('\n').filter(l => l.trim().length > 0);
    const rawTitle = lines[0] ? lines[0].replace(/[*#_]/g, '').trim() : 'Catatan Rekomendasi Gemini';
    const cleanTitle = rawTitle.length > 50 ? rawTitle.slice(0, 50) + '...' : rawTitle;

    let detectedCategory: GeminiChatBoardNote['category'] = 'STRATEGY';
    const lower = msg.content.toLowerCase();
    if (lower.includes('promo') || lower.includes('broadcast') || lower.includes('diskon')) {
      detectedCategory = 'PROMO';
    } else if (lower.includes('kasbon') || lower.includes('piutang') || lower.includes('tagihan')) {
      detectedCategory = 'KASBON';
    } else if (lower.includes('stok') || lower.includes('belanja') || lower.includes('bahan baku')) {
      detectedCategory = 'STOCK';
    } else if (lower.includes('hpp') || lower.includes('resep') || lower.includes('porsi')) {
      detectedCategory = 'RECIPE';
    } else if (lower.includes('laba') || lower.includes('omzet') || lower.includes('rugi') || lower.includes('arus kas')) {
      detectedCategory = 'FINANCE';
    }

    const newNote: GeminiChatBoardNote = {
      id: `note-${Date.now()}`,
      title: cleanTitle || 'Catatan Gemini AI',
      content: msg.content,
      category: detectedCategory,
      createdAt: new Date().toISOString(),
      tags: ['Gemini AI', detectedCategory],
    };

    setBoardNotes(prev => [newNote, ...prev]);
    setPinnedSuccessId(msg.id);
    setTimeout(() => setPinnedSuccessId(null), 2500);
  };

  // Add custom manual note to board
  const handleCreateCustomNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteTitle.trim() || !newNoteContent.trim()) return;

    const newNote: GeminiChatBoardNote = {
      id: `note-custom-${Date.now()}`,
      title: newNoteTitle.trim(),
      content: newNoteContent.trim(),
      category: newNoteCategory,
      createdAt: new Date().toISOString(),
      tags: ['Manual', newNoteCategory],
    };

    setBoardNotes(prev => [newNote, ...prev]);
    setNewNoteTitle('');
    setNewNoteContent('');
    setShowAddNoteModal(false);
  };

  // Delete note from board
  const handleDeleteNote = (id: string) => {
    if (window.confirm('Hapus catatan ini dari Board?')) {
      setBoardNotes(prev => prev.filter(n => n.id !== id));
    }
  };

  // Clear Chat History
  const handleClearChat = () => {
    if (window.confirm('Bersihkan riwayat percakapan dengan Gemini?')) {
      const resetMsg: GeminiChatMessage = {
        id: `msg-welcome-${Date.now()}`,
        role: 'assistant',
        content: `Percakapan telah dibersihkan. Halo ${currentUser?.name || 'Kak'}! Ada yang bisa saya bantu untuk bisnis warung **${storeSettings.name || 'HannaBee'}** hari ini?`,
        timestamp: new Date().toISOString(),
        modelUsed: 'gemini-3.7-flash',
      };
      setMessages([resetMsg]);
    }
  };

  // Filtered Board Notes
  const filteredBoardNotes = useMemo(() => {
    return boardNotes.filter(note => {
      const matchesCategory = boardCategoryFilter === 'ALL' || note.category === boardCategoryFilter;
      const matchesSearch =
        !boardSearchQuery.trim() ||
        note.title.toLowerCase().includes(boardSearchQuery.toLowerCase()) ||
        note.content.toLowerCase().includes(boardSearchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [boardNotes, boardCategoryFilter, boardSearchQuery]);

  // Quick Preset Prompt Chips
  const quickPrompts = [
    {
      id: 'quick-today',
      icon: <TrendingUp size={14} className="text-emerald-600" />,
      label: '📊 Analisis Omzet Hari Ini',
      prompt: 'Tolong analisis performa penjualan dan laba kotor warung saya hari ini berdasarkan data transaksi terkini, serta berikan 3 evaluasi operasional penting.',
      action: 'analysis',
    },
    {
      id: 'quick-promo',
      icon: <Flame size={14} className="text-amber-600" />,
      label: '🔥 Buat Promo WhatsApp Menu Best Seller',
      prompt: 'Buatkan draf pesan WhatsApp promosi yang menggugah selera untuk menu terlaris kami, lengkap dengan emoji dan ajakan beli yang ramah.',
      action: 'promo',
    },
    {
      id: 'quick-stock',
      icon: <ShoppingCart size={14} className="text-blue-600" />,
      label: '🛒 Rekomendasi Belanja & Stok Menipis',
      prompt: 'Cek daftar stok menu yang menipis dan belanja bahan baku kami. Berikan saran prioritas pengadaan barang agar tidak kehabisan stok saat jam ramai.',
      action: 'stock',
    },
    {
      id: 'quick-kasbon',
      icon: <DollarSign size={14} className="text-purple-600" />,
      label: '💬 Draf Pengingat Kasbon Santun',
      prompt: 'Buatkan draf pesan WhatsApp penagihan kasbon yang sangat santun, hangat, sopan, dan tidak menyinggung pelanggan setia warung.',
      action: 'kasbon',
    },
    {
      id: 'quick-bundling',
      icon: <Utensils size={14} className="text-teal-600" />,
      label: '💡 Ide Paket Bundling Menu',
      prompt: 'Berikan 3 ide paket bundling (combo hemat) jajanan wareg dan minuman seger untuk menaikkan rata-rata nilai belanja per pelanggan.',
      action: 'bundling',
    },
  ];

  // Customers with Kasbon
  const customersWithKasbon = useMemo(() => {
    return customers.filter(c => (c.unpaidKasbonBalance || 0) > 0);
  }, [customers]);

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-5 animate-in fade-in duration-200">
      {/* Top Banner & Header Summary */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-5 sm:p-6 text-white border border-slate-800 shadow-lg relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute left-1/2 bottom-0 -translate-x-1/2 translate-y-12 w-96 h-32 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-lg bg-amber-400/20 text-amber-300 font-bold text-xs border border-amber-400/30 flex items-center gap-1.5">
                <Sparkles size={14} className="text-amber-400 animate-pulse" />
                <span>Powered by Gemini 3.7 Flash</span>
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 font-bold text-xs border border-emerald-500/30 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Real-time POS Grounded</span>
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
              <span>Gemini Business AI & Strategy Board</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              Asisten kecerdasan bisnis, konsultan keuangan warung, dan generator strategi pemasaran otomatis yang terhubung langsung ke data POS <strong className="text-amber-300">{storeSettings.name}</strong>.
            </p>
          </div>

          {/* Quick Stats Pill */}
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 shrink-0 bg-white/10 backdrop-blur-md p-3 rounded-xl border border-white/10">
            <div className="text-left px-2">
              <p className="text-[10px] text-slate-300 uppercase tracking-wider font-semibold">Omzet Hari Ini</p>
              <p className="text-sm font-bold text-emerald-400">
                Rp {storeContextData.todaySalesSummary.totalRevenue.toLocaleString('id-ID')}
              </p>
            </div>
            <div className="w-px h-8 bg-white/20 hidden sm:block" />
            <div className="text-left px-2">
              <p className="text-[10px] text-slate-300 uppercase tracking-wider font-semibold">Stok Menipis</p>
              <p className="text-sm font-bold text-amber-400">
                {storeContextData.lowStockProducts.length} Menu
              </p>
            </div>
            <div className="w-px h-8 bg-white/20 hidden sm:block" />
            <div className="text-left px-2">
              <p className="text-[10px] text-slate-300 uppercase tracking-wider font-semibold">Kasbon Tertunda</p>
              <p className="text-sm font-bold text-rose-400">
                Rp {storeContextData.unpaidKasbonSummary.totalUnpaid.toLocaleString('id-ID')}
              </p>
            </div>
          </div>
        </div>

        {/* Sub-tab Navigation */}
        <div className="flex items-center gap-2 mt-5 pt-4 border-t border-slate-800/80">
          <button
            id="gemini-tab-chat-btn"
            onClick={() => setActiveBoardTab('chat')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
              activeBoardTab === 'chat'
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-slate-800/70 hover:bg-slate-800 text-slate-300 hover:text-white'
            }`}
          >
            <MessageSquare size={15} />
            <span>💬 Obrolan Interaktif Gemini</span>
            <span className="px-1.5 py-0.5 rounded-full bg-white/20 text-[10px] font-mono">
              {messages.length}
            </span>
          </button>

          <button
            id="gemini-tab-board-btn"
            onClick={() => setActiveBoardTab('board')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
              activeBoardTab === 'board'
                ? 'bg-amber-600 text-white shadow-md'
                : 'bg-slate-800/70 hover:bg-slate-800 text-slate-300 hover:text-white'
            }`}
          >
            <LayoutGrid size={15} />
            <span>📌 Board Catatan & Strategi</span>
            <span className="px-1.5 py-0.5 rounded-full bg-white/20 text-[10px] font-mono">
              {boardNotes.length}
            </span>
          </button>

          <button
            id="gemini-tab-tools-btn"
            onClick={() => setActiveBoardTab('tools')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
              activeBoardTab === 'tools'
                ? 'bg-purple-600 text-white shadow-md'
                : 'bg-slate-800/70 hover:bg-slate-800 text-slate-300 hover:text-white'
            }`}
          >
            <Wand2 size={15} />
            <span>⚡ Generator Cepat & Smart Tools</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1. CHAT ASSISTANT TAB */}
      {/* ========================================================================= */}
      {activeBoardTab === 'chat' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs flex flex-col h-[640px] overflow-hidden">
          {/* Chat Top Bar */}
          <div className="p-3.5 sm:p-4 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-xs">
                <Bot size={18} />
              </div>
              <div>
                <h3 className="font-bold text-xs sm:text-sm text-slate-900 flex items-center gap-1.5">
                  <span>Gemini Assistant Konsultan Warung</span>
                  <span className="px-1.5 py-0.5 rounded-xs bg-blue-100 text-blue-700 text-[10px] font-mono font-bold">
                    v3.7 Flash
                  </span>
                </h3>
                <p className="text-[11px] text-slate-500">
                  Terhubung ke {products.length} Menu & {transactions.length} Data Transaksi
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                id="clear-chat-history-btn"
                onClick={handleClearChat}
                className="px-2.5 py-1.5 text-xs text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition flex items-center gap-1"
                title="Bersihkan riwayat percakapan"
              >
                <Trash2 size={13} />
                <span className="hidden sm:inline">Reset Chat</span>
              </button>
            </div>
          </div>

          {/* Quick Prompt Chips */}
          <div className="p-2.5 bg-slate-100/70 border-b border-slate-200/80 flex items-center gap-2 overflow-x-auto shrink-0 scrollbar-thin">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap pl-1">
              Pintas Cepat:
            </span>
            {quickPrompts.map(qp => (
              <button
                key={qp.id}
                id={`quick-prompt-btn-${qp.id}`}
                onClick={() => handleSendMessage(qp.prompt, qp.action)}
                disabled={isLoading}
                className="px-2.5 py-1 bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-lg text-xs font-semibold text-slate-700 whitespace-nowrap shadow-2xs transition flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
              >
                {qp.icon}
                <span>{qp.label}</span>
              </button>
            ))}
          </div>

          {/* Chat Messages Body */}
          <div className="flex-1 p-4 sm:p-5 overflow-y-auto space-y-4 bg-slate-50/40">
            {messages.map(msg => {
              const isUser = msg.role === 'user';
              return (
                <div
                  key={msg.id}
                  className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'} animate-in fade-in duration-150`}
                >
                  {!isUser && (
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-500 to-indigo-600 text-white flex items-center justify-center shrink-0 shadow-2xs mt-1">
                      <Sparkles size={16} />
                    </div>
                  )}

                  <div className={`max-w-[85%] sm:max-w-[75%] space-y-1.5`}>
                    <div
                      className={`p-4 rounded-2xl text-xs sm:text-sm leading-relaxed shadow-2xs ${
                        isUser
                          ? 'bg-blue-600 text-white rounded-tr-xs'
                          : msg.isError
                          ? 'bg-red-50 text-red-800 border border-red-200 rounded-tl-xs'
                          : 'bg-white text-slate-800 border border-slate-200/90 rounded-tl-xs'
                      }`}
                    >
                      {/* Markdown friendly text rendering */}
                      <div className="whitespace-pre-wrap font-sans space-y-1">
                        {msg.content.split('\n').map((line, idx) => {
                          // Formatting basic bold markers
                          const isHeading = line.startsWith('**') && line.endsWith('**');
                          const isBullet = line.trim().startsWith('-') || line.trim().startsWith('*') || /^\d+\./.test(line.trim());
                          return (
                            <p
                              key={idx}
                              className={`${
                                isHeading ? 'font-bold text-slate-950 pt-1' : ''
                              } ${isBullet ? 'pl-2' : ''}`}
                            >
                              {line}
                            </p>
                          );
                        })}
                      </div>
                    </div>

                    {/* Footer Actions for Assistant message */}
                    {!isUser && !msg.isError && (
                      <div className="flex items-center gap-1.5 pt-0.5 px-1">
                        <span className="text-[10px] text-slate-400 font-mono">
                          {new Date(msg.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <span className="text-slate-300">•</span>
                        <button
                          id={`copy-msg-btn-${msg.id}`}
                          onClick={() => handleCopyText(msg.id, msg.content)}
                          className="px-2 py-0.5 text-[11px] font-semibold text-slate-500 hover:text-slate-800 hover:bg-slate-200/60 rounded-md transition flex items-center gap-1"
                          title="Salin Teks"
                        >
                          {copiedId === msg.id ? (
                            <>
                              <Check size={12} className="text-emerald-600" />
                              <span className="text-emerald-600">Tersalin!</span>
                            </>
                          ) : (
                            <>
                              <Copy size={12} />
                              <span>Salin</span>
                            </>
                          )}
                        </button>

                        <button
                          id={`pin-msg-btn-${msg.id}`}
                          onClick={() => handlePinToBoard(msg)}
                          className="px-2 py-0.5 text-[11px] font-semibold text-amber-700 hover:text-amber-900 hover:bg-amber-100/60 rounded-md transition flex items-center gap-1"
                          title="Sematkan / Simpan ke Board Catatan"
                        >
                          {pinnedSuccessId === msg.id ? (
                            <>
                              <CheckCircle2 size={12} className="text-emerald-600" />
                              <span className="text-emerald-600 font-bold">Tersemat di Board!</span>
                            </>
                          ) : (
                            <>
                              <Pin size={12} />
                              <span>Pin ke Board</span>
                            </>
                          )}
                        </button>

                        <button
                          id={`wa-share-msg-btn-${msg.id}`}
                          onClick={() => handleShareWhatsApp(msg.content)}
                          className="px-2 py-0.5 text-[11px] font-semibold text-emerald-700 hover:text-emerald-900 hover:bg-emerald-100/60 rounded-md transition flex items-center gap-1"
                          title="Kirim / Bagikan via WhatsApp"
                        >
                          <MessageCircle size={12} />
                          <span>Kirim WA</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {isUser && (
                    <div className="w-8 h-8 rounded-xl bg-slate-900 text-white flex items-center justify-center shrink-0 shadow-2xs mt-1">
                      <span className="font-bold text-xs">
                        {(currentUser?.name || 'U').charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}

            {isLoading && (
              <div className="flex gap-3 justify-start animate-in fade-in duration-150">
                <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-2xs mt-1 animate-pulse">
                  <Sparkles size={16} />
                </div>
                <div className="bg-white border border-slate-200 p-4 rounded-2xl rounded-tl-xs shadow-2xs space-y-2">
                  <div className="flex items-center gap-2">
                    <RefreshCw size={14} className="text-blue-600 animate-spin" />
                    <p className="text-xs font-bold text-slate-800">
                      Gemini sedang menganalisis data & menyusun rekomendasi...
                    </p>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Memeriksa metrik omzet, HPP, stok barang, dan draf pesan cerdas
                  </p>
                </div>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>

          {/* Chat Input Bar */}
          <div className="p-3 sm:p-4 bg-white border-t border-slate-200 shrink-0">
            <form
              onSubmit={e => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex items-center gap-2"
            >
              <input
                id="gemini-chat-prompt-input"
                type="text"
                value={inputPrompt}
                onChange={e => setInputPrompt(e.target.value)}
                placeholder="Tanyakan analisis omzet, draf promo WhatsApp, rekomendasi menu, kasbon, atau HPP..."
                disabled={isLoading}
                className="flex-1 px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
              />
              <button
                id="gemini-chat-send-btn"
                type="submit"
                disabled={isLoading || !inputPrompt.trim()}
                className="px-4 sm:px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-xl text-xs sm:text-sm font-bold shadow-xs transition flex items-center gap-1.5 shrink-0"
              >
                {isLoading ? (
                  <RefreshCw size={16} className="animate-spin" />
                ) : (
                  <>
                    <span>Kirim</span>
                    <Send size={15} />
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. BOARD CATATAN & STRATEGI TAB */}
      {/* ========================================================================= */}
      {activeBoardTab === 'board' && (
        <div className="space-y-4">
          {/* Board Actions & Filter Header */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Kategori:</span>
              {[
                { key: 'ALL', label: 'Semua Catatan' },
                { key: 'PROMO', label: '📢 Promo & WA' },
                { key: 'STRATEGY', label: '💡 Strategi Bisnis' },
                { key: 'STOCK', label: '🛒 Belanja & Stok' },
                { key: 'KASBON', label: '💳 Kasbon' },
                { key: 'RECIPE', label: '🍳 Resep & HPP' },
                { key: 'FINANCE', label: '💰 Keuangan' },
              ].map(cat => (
                <button
                  key={cat.key}
                  id={`filter-board-cat-${cat.key}`}
                  onClick={() => setBoardCategoryFilter(cat.key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                    boardCategoryFilter === cat.key
                      ? 'bg-slate-900 text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={boardSearchQuery}
                  onChange={e => setBoardSearchQuery(e.target.value)}
                  placeholder="Cari catatan board..."
                  className="pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <button
                id="create-new-board-note-btn"
                onClick={() => setShowAddNoteModal(true)}
                className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs transition shrink-0"
              >
                <Plus size={15} />
                <span>+ Catatan Baru</span>
              </button>
            </div>
          </div>

          {/* Board Grid Notes */}
          {filteredBoardNotes.length === 0 ? (
            <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
                <LayoutGrid size={24} />
              </div>
              <h3 className="font-bold text-slate-800 text-sm">Belum Ada Catatan di Board</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Anda dapat menyematkan (Pin) rekomendasi dari Obrolan Gemini atau menambahkan catatan strategi manual baru di sini.
              </p>
              <button
                onClick={() => setShowAddNoteModal(true)}
                className="px-4 py-2 bg-amber-600 text-white rounded-xl text-xs font-bold shadow-xs hover:bg-amber-700 transition inline-flex items-center gap-1.5"
              >
                <Plus size={14} />
                <span>Buat Catatan Pertama</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredBoardNotes.map(note => {
                const categoryColorMap: { [key: string]: { bg: string; text: string; border: string } } = {
                  PROMO: { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200' },
                  STRATEGY: { bg: 'bg-amber-50', text: 'text-amber-800', border: 'border-amber-200' },
                  STOCK: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
                  KASBON: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
                  RECIPE: { bg: 'bg-teal-50', text: 'text-teal-700', border: 'border-teal-200' },
                  FINANCE: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
                  NOTE: { bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-200' },
                };

                const catStyle = categoryColorMap[note.category] || categoryColorMap.NOTE;

                return (
                  <div
                    key={note.id}
                    id={`board-note-card-${note.id}`}
                    className="bg-white rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition p-4 sm:p-5 flex flex-col justify-between space-y-3"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${catStyle.bg} ${catStyle.text} ${catStyle.border}`}
                        >
                          {note.category}
                        </span>
                        <div className="flex items-center gap-1 text-[10px] text-slate-400">
                          <Clock size={11} />
                          <span>
                            {new Date(note.createdAt).toLocaleDateString('id-ID', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </span>
                        </div>
                      </div>

                      <h4 className="font-bold text-sm text-slate-900 leading-snug">{note.title}</h4>

                      <div className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto pr-1">
                        {note.content}
                      </div>
                    </div>

                    {/* Card Actions */}
                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <button
                          id={`copy-board-note-btn-${note.id}`}
                          onClick={() => handleCopyText(note.id, note.content)}
                          className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition"
                          title="Salin Catatan"
                        >
                          {copiedId === note.id ? (
                            <Check size={14} className="text-emerald-600" />
                          ) : (
                            <Copy size={14} />
                          )}
                        </button>

                        <button
                          id={`wa-share-board-note-btn-${note.id}`}
                          onClick={() => handleShareWhatsApp(note.content)}
                          className="p-1.5 text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 rounded-lg transition"
                          title="Kirim ke WhatsApp"
                        >
                          <MessageCircle size={14} />
                        </button>
                      </div>

                      <button
                        id={`delete-board-note-btn-${note.id}`}
                        onClick={() => handleDeleteNote(note.id)}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                        title="Hapus dari Board"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. SMART TOOLS & ACTION HUB TAB */}
      {/* ========================================================================= */}
      {activeBoardTab === 'tools' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Tool 1: WhatsApp Promo Broadcast Generator */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
                <Flame size={18} />
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-900">WhatsApp Promo Broadcast Generator</h3>
                <p className="text-[11px] text-slate-500">Buat draf promosi menarik dalam 1 klik</p>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Target Penawaran</label>
                <select
                  value={toolPromoTarget}
                  onChange={e => setToolPromoTarget(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs"
                >
                  <option value="all">Semua Pelanggan (Broadcast Umum)</option>
                  <option value="loyal">Pelanggan Loyal & Member Saldo</option>
                  <option value="weekend">Spesial Akhir Pekan (Weekend Warung)</option>
                  <option value="new_menu">Menu Baru / Menu Best Seller</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Highlight Menu / Diskon</label>
                <input
                  type="text"
                  value={toolPromoHighlight}
                  onChange={e => setToolPromoHighlight(e.target.value)}
                  placeholder="Contoh: Paket Wareg Seger, Beli 2 Es Cincau Gratis 1"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs"
                />
              </div>

              <button
                id="generate-promo-btn"
                onClick={() => {
                  const promptText = `Buatkan teks broadcast WhatsApp promosi yang menggugah selera untuk target '${toolPromoTarget}' dengan highlight: '${toolPromoHighlight || 'Menu Best Seller'}'. Gunakan format WhatsApp yang menarik (bold, emoji, ajakan order).`;
                  setActiveBoardTab('chat');
                  handleSendMessage(promptText, 'promo');
                }}
                className="w-full py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-xs transition flex items-center justify-center gap-1.5"
              >
                <Sparkles size={14} />
                <span>Buat Teks Promo via Gemini</span>
              </button>
            </div>
          </div>

          {/* Tool 2: Pengingat Kasbon Santun Generator */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
                <DollarSign size={18} />
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-900">Draf Pengingat Kasbon Santun</h3>
                <p className="text-[11px] text-slate-500">Pesan penagihan ramah & menjaga silaturahmi</p>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Pilih Pelanggan Kasbon</label>
                <select
                  value={toolKasbonCustomerId}
                  onChange={e => setToolKasbonCustomerId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs"
                >
                  <option value="">-- Pilih Pelanggan --</option>
                  {customersWithKasbon.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name} (Kasbon: Rp {(c.unpaidKasbonBalance || 0).toLocaleString('id-ID')})
                    </option>
                  ))}
                </select>
                {customersWithKasbon.length === 0 && (
                  <p className="text-[10px] text-emerald-600 font-semibold mt-1">
                    ✓ Tidak ada kasbon pelanggan yang tertunda saat ini.
                  </p>
                )}
              </div>

              <button
                id="generate-kasbon-msg-btn"
                onClick={() => {
                  const cust = customers.find(c => c.id === toolKasbonCustomerId);
                  const custName = cust ? cust.name : 'Pelanggan';
                  const custAmount = cust ? `Rp ${(cust.unpaidKasbonBalance || 0).toLocaleString('id-ID')}` : 'sesuai nota';
                  const promptText = `Buatkan pesan WhatsApp pengingat kasbon yang sangat santun, bersahabat, dan sopan untuk ${custName} dengan jumlah kasbon ${custAmount}. Berikan nomor rekening/QRIS untuk transfer atau opsi bayar di kasir.`;
                  setActiveBoardTab('chat');
                  handleSendMessage(promptText, 'kasbon');
                }}
                className="w-full py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold shadow-xs transition flex items-center justify-center gap-1.5"
              >
                <Sparkles size={14} />
                <span>Buat Pesan Penagihan Santun</span>
              </button>
            </div>
          </div>

          {/* Tool 3: Kalkulator HPP & Target Margin */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center font-bold">
                <Utensils size={18} />
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-900">Konsultasi HPP & Harga Jual Menu</h3>
                <p className="text-[11px] text-slate-500">Hitung harga jual optimal dengan target laba kotor</p>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nama Menu Baru</label>
                <input
                  type="text"
                  value={toolHppMenuName}
                  onChange={e => setToolHppMenuName(e.target.value)}
                  placeholder="Contoh: Ayam Geprek Sambal Matah Spesial"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Total Biaya Bahan (HPP)</label>
                  <input
                    type="number"
                    value={toolHppCost}
                    onChange={e => setToolHppCost(e.target.value)}
                    placeholder="Rp 8.000"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Target Margin (%)</label>
                  <input
                    type="number"
                    value={toolHppTargetMargin}
                    onChange={e => setToolHppTargetMargin(e.target.value)}
                    placeholder="40"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs"
                  />
                </div>
              </div>

              <button
                id="generate-hpp-advice-btn"
                onClick={() => {
                  const promptText = `Tolong hitung dan berikan rekomendasi harga jual optimal untuk menu baru '${toolHppMenuName || 'Menu Warung'}' dengan HPP bahan baku Rp ${toolHppCost || '0'} dan target margin laba kotor ${toolHppTargetMargin || '40'}%. Berikan saran psikologi harga dan strategi promosi peluncurannya.`;
                  setActiveBoardTab('chat');
                  handleSendMessage(promptText, 'recipe');
                }}
                className="w-full py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold shadow-xs transition flex items-center justify-center gap-1.5"
              >
                <Sparkles size={14} />
                <span>Konsultasi HPP & Strategi Harga</span>
              </button>
            </div>
          </div>

          {/* Tool 4: Diagnosa Kesehatan Bisnis Warung */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center font-bold">
                <TrendingUp size={18} />
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-900">Diagnosis Menyeluruh Bisnis Warung</h3>
                <p className="text-[11px] text-slate-500">Evaluasi omzet, margin, beban operasional, dan kas</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Gemini akan membaca total transaksi bulan ini, rasio beban operasional terhadap penjualan, perputaran piutang kasbon, serta memberikan 4 langkah strategis untuk mempercepat perputaran kas.
            </p>

            <button
              id="generate-business-checkup-btn"
              onClick={() => {
                const promptText = `Lakukan evaluasi diagnosa menyeluruh performa keuangan dan operasional warung saya bulan ini. Tinjau omzet, beban biaya, margin keuntungan, dan piutang kasbon, lalu berikan 4 saran taktis prioritas.`;
                setActiveBoardTab('chat');
                handleSendMessage(promptText, 'analysis');
              }}
              className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-xs transition flex items-center justify-center gap-1.5"
            >
              <Sparkles size={14} />
              <span>Jalankan Diagnosa Bisnis Sekarang</span>
            </button>
          </div>
        </div>
      )}

      {/* Add Custom Note Modal */}
      {showAddNoteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200">
            <div className="p-4 bg-slate-900 text-white flex justify-between items-center">
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
                  <Plus size={16} />
                </span>
                <h3 className="font-bold text-sm">Tambah Catatan Strategi Baru</h3>
              </div>
              <button
                onClick={() => setShowAddNoteModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateCustomNote} className="p-5 space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Kategori Catatan</label>
                <select
                  value={newNoteCategory}
                  onChange={e => setNewNoteCategory(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs"
                >
                  <option value="PROMO">📢 Promo & Broadcast WhatsApp</option>
                  <option value="STRATEGY">💡 Strategi Bisnis & Bundling</option>
                  <option value="STOCK">🛒 Belanja & Manajemen Stok</option>
                  <option value="KASBON">💳 Kasbon & Piutang</option>
                  <option value="RECIPE">🍳 Resep & Hitungan HPP</option>
                  <option value="FINANCE">💰 Keuangan & Arus Kas</option>
                  <option value="NOTE">📝 Catatan Bebas</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Judul Catatan</label>
                <input
                  type="text"
                  value={newNoteTitle}
                  onChange={e => setNewNoteTitle(e.target.value)}
                  placeholder="Contoh: Ide Paket Menu Akhir Bulan"
                  required
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Isi Catatan / Strategi</label>
                <textarea
                  value={newNoteContent}
                  onChange={e => setNewNoteContent(e.target.value)}
                  rows={4}
                  placeholder="Tuliskan draf promo, catatan resep, ide harga, atau strategi warung..."
                  required
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddNoteModal(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-xs transition"
                >
                  Simpan ke Board
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
