import React, { useState, useEffect } from 'react';
import { useWarung } from '../context/WarungContext';
import { useRegisterModal } from '../context/ModalContext';
import {
  Sparkles,
  X,
  Send,
  MessageCircle,
  TrendingUp,
  ShoppingBag,
  RotateCcw,
  Copy,
  Check,
  Store,
  Lightbulb,
  AlertTriangle,
} from 'lucide-react';

interface GeminiAiModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'chat' | 'promo' | 'analytics' | 'shopping';
}

export const GeminiAiModal: React.FC<GeminiAiModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'chat',
}) => {
  useRegisterModal(isOpen, onClose, 'gemini-ai-assistant-modal');

  const { storeSettings, transactions, products, expenses, customers, shoppingItems } = useWarung();

  const [activeTab, setActiveTab] = useState<'chat' | 'promo' | 'analytics' | 'shopping'>(initialTab);

  useEffect(() => {
    if (isOpen && initialTab) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  // Chat Tab State
  const [chatMessages, setChatMessages] = useState<Array<{ role: 'user' | 'model'; text: string }>>([
    {
      role: 'model',
      text: `Halo! Saya Asisten Bisnis & Keuangan Warung AI untuk **${storeSettings.storeName || 'HannaBee'}**. Ada yang bisa saya bantu untuk meningkatkan omzet, merancang menu baru, atau strategi operasional warung hari ini?`,
    },
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);

  // Promo Generator State
  const [promoTopic, setPromoTopic] = useState('Promo Menu Terlaris & Diskon Akhir Pekan');
  const [promoResult, setPromoResult] = useState('');
  const [isPromoLoading, setIsPromoLoading] = useState(false);
  const [copiedPromo, setCopiedPromo] = useState(false);

  // Analytics Advisor State
  const [analysisResult, setAnalysisResult] = useState('');
  const [isAnalysisLoading, setIsAnalysisLoading] = useState(false);

  // Shopping Advisor State
  const [shoppingAdvice, setShoppingAdvice] = useState('');
  const [isShoppingLoading, setIsShoppingLoading] = useState(false);

  if (!isOpen) return null;

  // Handle Send Chat
  const handleSendChat = async (promptToSend?: string) => {
    const text = promptToSend || chatInput.trim();
    if (!text || isChatLoading) return;

    const newMessages = [...chatMessages, { role: 'user' as const, text }];
    setChatMessages(newMessages);
    setChatInput('');
    setIsChatLoading(true);

    try {
      const res = await fetch('/api/ai/advisor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'custom_chat',
          prompt: text,
          summary: {
            storeName: storeSettings.storeName,
            tagline: storeSettings.tagline,
            phone: storeSettings.phone,
          },
          messageHistory: newMessages.slice(-6),
        }),
      });

      const json = await res.json();
      if (json.content) {
        setChatMessages(prev => [...prev, { role: 'model', text: json.content }]);
      } else {
        setChatMessages(prev => [
          ...prev,
          { role: 'model', text: 'Maaf, terjadi kendala saat memproses balasan. Silakan coba lagi.' },
        ]);
      }
    } catch {
      setChatMessages(prev => [
        ...prev,
        {
          role: 'model',
          text: 'Tidak dapat terhubung ke server AI. Mohon pastikan koneksi internet Anda stabil.',
        },
      ]);
    } finally {
      setIsChatLoading(false);
    }
  };

  // Handle Generate Promo
  const handleGeneratePromo = async (presetTopic?: string) => {
    const topic = presetTopic || promoTopic;
    setIsPromoLoading(true);

    // Get top 3 products as context
    const topProducts = products.filter(p => !p.isArchived).slice(0, 4).map(p => p.name).join(', ');

    try {
      const res = await fetch('/api/ai/advisor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'promo',
          prompt: topic,
          summary: {
            storeName: storeSettings.storeName,
            tagline: storeSettings.tagline,
            phone: storeSettings.phone,
            topMenus: topProducts,
          },
        }),
      });

      const json = await res.json();
      if (json.content) {
        setPromoResult(json.content);
      }
    } catch {
      setPromoResult('Gagal membuat pesan promosi. Silakan ulangi.');
    } finally {
      setIsPromoLoading(false);
    }
  };

  // Handle Generate Business Analysis
  const handleGenerateBusinessAnalysis = async () => {
    setIsAnalysisLoading(true);

    // Calculate quick stats
    const nonCancelled = transactions.filter(t => t.status !== 'BATAL');
    const totalRev = nonCancelled.reduce((s, t) => s + t.finalAmount, 0);
    const totalProfit = nonCancelled.reduce((s, t) => s + (t.grossProfit || 0), 0);
    const totalExp = expenses.reduce((s, e) => s + e.amount, 0);
    const totalDebt = customers.reduce((s, c) => s + (c.totalDebt || 0), 0);

    const productSalesMap: { [id: string]: { name: string; qty: number } } = {};
    nonCancelled.forEach(t => {
      t.items.forEach(i => {
        if (!productSalesMap[i.productId]) {
          productSalesMap[i.productId] = { name: i.productName, qty: 0 };
        }
        productSalesMap[i.productId].qty += i.quantity;
      });
    });

    const topList = Object.values(productSalesMap)
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5)
      .map(p => `${p.name} (${p.qty}x)`)
      .join(', ');

    try {
      const res = await fetch('/api/ai/advisor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'business_summary',
          summary: {
            storeName: storeSettings.storeName,
            periodLabel: 'Akumulasi Transaksi Warung',
            revenue: totalRev,
            transactionCount: nonCancelled.length,
            grossProfit: totalProfit,
            expensesTotal: totalExp,
            unpaidDebtTotal: totalDebt,
            topProducts: topList || 'Belum ada data transaksi',
          },
        }),
      });

      const json = await res.json();
      if (json.content) {
        setAnalysisResult(json.content);
      }
    } catch {
      setAnalysisResult('Gagal memuat analisis bisnis.');
    } finally {
      setIsAnalysisLoading(false);
    }
  };

  // Handle Generate Shopping Advice
  const handleGenerateShoppingAdvice = async () => {
    setIsShoppingLoading(true);

    const lowStock = products.filter(p => !p.isArchived && p.stock <= 5).map(p => `${p.name} (Sisa ${p.stock} ${p.unit})`).join(', ');
    const pendingList = shoppingItems.filter(s => s.status !== 'PURCHASED').map(s => `${s.name} (${s.quantity} ${s.unit})`).join(', ');
    const estBudget = shoppingItems.filter(s => s.status !== 'PURCHASED').reduce((s, i) => s + (i.estimatedPrice || 0), 0);

    try {
      const res = await fetch('/api/ai/advisor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'shopping_optimizer',
          summary: {
            storeName: storeSettings.storeName,
            lowStockItems: lowStock || 'Semua stok menu masih aman',
            pendingItems: pendingList || 'Belum ada daftar belanja aktif',
            estimatedBudget: estBudget,
          },
        }),
      });

      const json = await res.json();
      if (json.content) {
        setShoppingAdvice(json.content);
      }
    } catch {
      setShoppingAdvice('Gagal memuat saran belanja bahan baku.');
    } finally {
      setIsShoppingLoading(false);
    }
  };

  // Copy Promo to Clipboard
  const handleCopyPromo = () => {
    if (!promoResult) return;
    navigator.clipboard.writeText(promoResult);
    setCopiedPromo(true);
    setTimeout(() => setCopiedPromo(false), 2000);
  };

  // Open Direct WhatsApp with Promo
  const handleSharePromoWhatsApp = () => {
    if (!promoResult) return;
    const encoded = encodeURIComponent(promoResult);
    window.open(`https://api.whatsapp.com/send?text=${encoded}`, '_blank');
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 animate-in fade-in duration-150 overflow-y-auto cursor-pointer"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full border border-slate-200 cursor-default my-auto max-h-[90vh] flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 bg-slate-900 text-white flex justify-between items-center shrink-0">
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center shadow-xs">
              <Sparkles size={18} />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm sm:text-base leading-tight">Asisten Warung Gemini AI</h3>
                <span className="text-[10px] bg-amber-400/20 text-amber-300 font-mono font-bold px-1.5 py-0.2 rounded border border-amber-400/30">
                  Gemini 3.8
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Konsultasi bisnis, draf promo WhatsApp, dan optimasi operasional warung
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
            title="Tutup"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-3 py-2 gap-1.5 overflow-x-auto shrink-0 scrollbar-none">
          <button
            onClick={() => setActiveTab('chat')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition whitespace-nowrap cursor-pointer ${
              activeTab === 'chat'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <MessageCircle size={14} />
            <span>Tanya Bisnis</span>
          </button>
          <button
            onClick={() => {
              setActiveTab('promo');
              if (!promoResult) handleGeneratePromo();
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition whitespace-nowrap cursor-pointer ${
              activeTab === 'promo'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Sparkles size={14} />
            <span>Draf Promo WA</span>
          </button>
          <button
            onClick={() => {
              setActiveTab('analytics');
              if (!analysisResult) handleGenerateBusinessAnalysis();
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition whitespace-nowrap cursor-pointer ${
              activeTab === 'analytics'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <TrendingUp size={14} />
            <span>Analisis Kinerja</span>
          </button>
          <button
            onClick={() => {
              setActiveTab('shopping');
              if (!shoppingAdvice) handleGenerateShoppingAdvice();
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition whitespace-nowrap cursor-pointer ${
              activeTab === 'shopping'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <ShoppingBag size={14} />
            <span>Saran Belanja</span>
          </button>
        </div>

        {/* Tab 1: Chat Tab */}
        {activeTab === 'chat' && (
          <div className="flex-1 flex flex-col p-4 overflow-hidden min-h-[380px]">
            {/* Quick Prompts */}
            <div className="mb-3 flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none shrink-0">
              <span className="text-[10px] text-slate-400 font-medium whitespace-nowrap">Ide Cepat:</span>
              {[
                'Tips menaikkan omzet menu minuman',
                'Cara sopan tagih kasbon pelanggan',
                'Ide paket hemat menarik pelanggan',
                'Strategi tekan biaya bahan baku',
              ].map((qp, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSendChat(qp)}
                  className="px-2.5 py-1 bg-slate-100 hover:bg-amber-50 hover:text-amber-900 hover:border-amber-200 text-slate-700 border border-slate-200 rounded-full text-[11px] whitespace-nowrap transition cursor-pointer"
                >
                  {qp}
                </button>
              ))}
            </div>

            {/* Messages Scroll Area */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-1 text-xs">
              {chatMessages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 leading-relaxed whitespace-pre-wrap ${
                      msg.role === 'user'
                        ? 'bg-blue-600 text-white rounded-br-xs'
                        : 'bg-slate-100 text-slate-800 rounded-bl-xs border border-slate-200/70'
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>
              ))}
              {isChatLoading && (
                <div className="flex justify-start">
                  <div className="bg-slate-100 text-slate-500 rounded-2xl rounded-bl-xs px-3.5 py-2 text-xs flex items-center gap-2 border border-slate-200/70">
                    <Sparkles size={14} className="animate-spin text-amber-500" />
                    <span>Gemini AI sedang berpikir...</span>
                  </div>
                </div>
              )}
            </div>

            {/* Input Bar */}
            <form
              onSubmit={e => {
                e.preventDefault();
                handleSendChat();
              }}
              className="mt-3 pt-3 border-t border-slate-200 flex items-center gap-2 shrink-0"
            >
              <input
                type="text"
                placeholder="Tanyakan apa saja seputar bisnis, resep, atau operasional warung..."
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                disabled={isChatLoading}
                className="flex-1 px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
              />
              <button
                type="submit"
                disabled={!chatInput.trim() || isChatLoading}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition disabled:opacity-50 cursor-pointer shadow-xs"
              >
                <Send size={13} />
                <span>Kirim</span>
              </button>
            </form>
          </div>
        )}

        {/* Tab 2: Promo Generator */}
        {activeTab === 'promo' && (
          <div className="flex-1 p-4 overflow-y-auto space-y-3.5 min-h-[380px]">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Pilih Topik Promosi WhatsApp:
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 mb-2">
                {[
                  'Diskon Akhir Pekan',
                  'Menu Baru Spesial',
                  'Promo Hari Gajian',
                  'Paket Cemilan Hemat',
                  'Penawaran Reseller',
                  'Makan Wareg Minum Seger',
                ].map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setPromoTopic(preset);
                      handleGeneratePromo(preset);
                    }}
                    className={`py-1.5 px-2 text-[11px] font-medium rounded-lg border transition text-left truncate cursor-pointer ${
                      promoTopic === preset
                        ? 'bg-blue-50 border-blue-300 text-blue-800 font-bold'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    ✨ {preset}
                  </button>
                ))}
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Atau ketik topik promo khusus Anda..."
                  value={promoTopic}
                  onChange={e => setPromoTopic(e.target.value)}
                  className="flex-1 px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={() => handleGeneratePromo()}
                  disabled={isPromoLoading}
                  className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition disabled:opacity-50 cursor-pointer shadow-xs"
                >
                  <Sparkles size={13} className={isPromoLoading ? 'animate-spin' : ''} />
                  <span>{isPromoLoading ? 'Membuat...' : 'Buat Ulang'}</span>
                </button>
              </div>
            </div>

            {/* Generated Promo Box */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-700">
                Draf Pesan WhatsApp Siap Kirim:
              </label>
              <textarea
                rows={9}
                value={promoResult}
                onChange={e => setPromoResult(e.target.value)}
                placeholder="Hasil teks promosi AI akan muncul di sini..."
                className="w-full p-3 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-mono leading-relaxed focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
              />
            </div>

            {/* Promo Actions */}
            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={handleCopyPromo}
                disabled={!promoResult}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer border border-slate-200"
              >
                {copiedPromo ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                <span>{copiedPromo ? 'Tersalin!' : 'Salin Teks'}</span>
              </button>
              <button
                type="button"
                onClick={handleSharePromoWhatsApp}
                disabled={!promoResult}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-xs"
              >
                <MessageCircle size={15} />
                <span>Bagikan ke WhatsApp</span>
              </button>
            </div>
          </div>
        )}

        {/* Tab 3: Analytics Review */}
        {activeTab === 'analytics' && (
          <div className="flex-1 p-4 overflow-y-auto space-y-3.5 min-h-[380px]">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-bold text-xs sm:text-sm text-slate-800">
                  Analisis Kinerja Bisnis & Margin Warung
                </h4>
                <p className="text-[11px] text-slate-500">
                  Gemini AI menganalisis data riwayat transaksi, pengeluaran, dan kasbon warung Anda
                </p>
              </div>
              <button
                type="button"
                onClick={handleGenerateBusinessAnalysis}
                disabled={isAnalysisLoading}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer border border-slate-200"
              >
                <RotateCcw size={13} className={isAnalysisLoading ? 'animate-spin' : ''} />
                <span>{isAnalysisLoading ? 'Menganalisis...' : 'Perbarui Analisis'}</span>
              </button>
            </div>

            {isAnalysisLoading ? (
              <div className="p-8 text-center text-slate-500 space-y-2">
                <Sparkles size={24} className="animate-spin text-amber-500 mx-auto" />
                <p className="text-xs font-medium">Gemini AI sedang menganalisis performa keuangan warung...</p>
              </div>
            ) : (
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs text-slate-800 leading-relaxed whitespace-pre-wrap">
                {analysisResult || 'Klik "Perbarui Analisis" untuk memulai review performa warung.'}
              </div>
            )}
          </div>
        )}

        {/* Tab 4: Shopping Optimizer */}
        {activeTab === 'shopping' && (
          <div className="flex-1 p-4 overflow-y-auto space-y-3.5 min-h-[380px]">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-bold text-xs sm:text-sm text-slate-800">
                  Rekomendasi Belanja Bahan Baku
                </h4>
                <p className="text-[11px] text-slate-500">
                  Deteksi otomatis menu yang stoknya menipis dan rekomendasi belanja hemat
                </p>
              </div>
              <button
                type="button"
                onClick={handleGenerateShoppingAdvice}
                disabled={isShoppingLoading}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer border border-slate-200"
              >
                <RotateCcw size={13} className={isShoppingLoading ? 'animate-spin' : ''} />
                <span>{isShoppingLoading ? 'Memproses...' : 'Cek Stok & Rekomendasi'}</span>
              </button>
            </div>

            {isShoppingLoading ? (
              <div className="p-8 text-center text-slate-500 space-y-2">
                <Sparkles size={24} className="animate-spin text-amber-500 mx-auto" />
                <p className="text-xs font-medium">Gemini AI sedang menghitung kebutuhan stok bahan baku...</p>
              </div>
            ) : (
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs text-slate-800 leading-relaxed whitespace-pre-wrap">
                {shoppingAdvice || 'Klik "Cek Stok & Rekomendasi" untuk melihat saran belanja bahan.'}
              </div>
            )}
          </div>
        )}

        {/* Modal Footer */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500 shrink-0">
          <div className="flex items-center gap-1.5">
            <Store size={13} className="text-slate-400" />
            <span>Konteks: {storeSettings.storeName || 'HannaBee'} POS</span>
          </div>
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg text-slate-600 hover:bg-slate-200 font-semibold transition cursor-pointer"
          >
            Tutup Jendela
          </button>
        </div>
      </div>
    </div>
  );
};
