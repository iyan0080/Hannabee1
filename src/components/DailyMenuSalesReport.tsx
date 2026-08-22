import React, { useState, useMemo } from 'react';
import { useWarung } from '../context/WarungContext';
import { ProductCategory } from '../types';
import { formatRupiah, formatDateOnly } from '../utils/format';
import {
  Calendar,
  CalendarRange,
  Search,
  Filter,
  UtensilsCrossed,
  Layers,
  TrendingUp,
  Award,
  ChevronDown,
  ChevronRight,
  FileSpreadsheet,
  FileText,
  Copy,
  Check,
  Percent,
  Sparkles,
  PieChart as PieChartIcon,
  RefreshCw,
  ShoppingBag,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export type MenuReportPeriod = 'TODAY' | 'YESTERDAY' | '7_DAYS' | '30_DAYS' | 'THIS_MONTH' | 'CUSTOM';

interface VariantSalesStat {
  variantId: string;
  variantName: string;
  quantity: number;
  revenue: number;
  cost: number;
  profit: number;
  avgPrice: number;
}

interface MenuSalesStat {
  productId: string;
  productName: string;
  category: ProductCategory | string;
  unit: string;
  totalQuantity: number;
  totalRevenue: number;
  totalCost: number;
  totalProfit: number;
  marginPercent: number;
  contributionPercent: number;
  avgPrice: number;
  variants: VariantSalesStat[];
}

export const DailyMenuSalesReport: React.FC = () => {
  const { transactions, products, storeSettings } = useWarung();

  // Period Selector State
  const [period, setPeriod] = useState<MenuReportPeriod>('TODAY');
  
  const getTodayISO = () => new Date().toISOString().slice(0, 10);
  const getYesterdayISO = () => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().slice(0, 10);
  };
  const get7DaysAgoISO = () => {
    const d = new Date();
    d.setDate(d.getDate() - 6);
    return d.toISOString().slice(0, 10);
  };

  const [customStartDate, setCustomStartDate] = useState<string>(getTodayISO());
  const [customEndDate, setCustomEndDate] = useState<string>(getTodayISO());

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('SEMUA');
  const [sortBy, setSortBy] = useState<'QTY' | 'REVENUE' | 'PROFIT' | 'NAME'>('QTY');
  const [sortOrder, setSortOrder] = useState<'DESC' | 'ASC'>('DESC');
  const [viewMode, setViewMode] = useState<'HIERARCHY' | 'FLAT'>('HIERARCHY');
  const [expandedProductIds, setExpandedProductIds] = useState<Set<string>>(new Set());
  const [copiedWa, setCopiedWa] = useState(false);

  // 1. Calculate Period Range Bounds
  const { startDate, endDate, periodLabel } = useMemo(() => {
    const now = new Date();
    let start = new Date();
    let end = new Date();
    let label = '';

    if (period === 'TODAY') {
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      label = `Hari Ini (${now.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })})`;
    } else if (period === 'YESTERDAY') {
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 0, 0, 0, 0);
      end = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59, 999);
      label = `Kemarin (${start.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })})`;
    } else if (period === '7_DAYS') {
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6, 0, 0, 0, 0);
      end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      label = `7 Hari Terakhir (${start.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} - ${end.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })})`;
    } else if (period === '30_DAYS') {
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29, 0, 0, 0, 0);
      end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      label = `30 Hari Terakhir (${start.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} - ${end.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })})`;
    } else if (period === 'THIS_MONTH') {
      start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      label = `Bulan Ini (${now.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })})`;
    } else {
      const s = customStartDate ? new Date(customStartDate + 'T00:00:00') : new Date();
      const e = customEndDate ? new Date(customEndDate + 'T23:59:59.999') : new Date();
      start = s;
      end = e;
      label = `${s.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })} s/d ${e.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}`;
    }

    return { startDate: start, endDate: end, periodLabel: label };
  }, [period, customStartDate, customEndDate]);

  // 2. Filter Valid Transactions in Period
  const activeTransactions = useMemo(() => {
    const startMs = startDate.getTime();
    const endMs = endDate.getTime();

    return transactions.filter(t => {
      if (t.status === 'BATAL') return false;
      const tMs = new Date(t.timestamp).getTime();
      return tMs >= startMs && tMs <= endMs;
    });
  }, [transactions, startDate, endDate]);

  // 3. Compute Aggregated Product and Variant Sales
  const { menuStatsList, overallTotalQty, overallTotalRevenue, overallTotalCost, overallTotalProfit } = useMemo(() => {
    const productMap: { [productId: string]: {
      productId: string;
      productName: string;
      category: string;
      unit: string;
      totalQuantity: number;
      totalRevenue: number;
      totalCost: number;
      variantsMap: { [varKey: string]: {
        variantId: string;
        variantName: string;
        quantity: number;
        revenue: number;
        cost: number;
      }};
    }} = {};

    // Map for faster lookup of product metadata
    const prodMetaMap = new Map<string, { category: string; unit: string }>();
    products.forEach(p => {
      prodMetaMap.set(p.id, { category: p.category, unit: p.unit || 'porsi' });
      prodMetaMap.set(p.name.toLowerCase().trim(), { category: p.category, unit: p.unit || 'porsi' });
    });

    let totalQty = 0;
    let totalRev = 0;
    let totalCst = 0;

    activeTransactions.forEach(trx => {
      trx.items.forEach(item => {
        const prodId = item.productId || 'custom-' + item.productName;
        const meta = prodMetaMap.get(item.productId) || prodMetaMap.get(item.productName.toLowerCase().trim()) || {
          category: 'Makanan',
          unit: 'porsi',
        };

        if (!productMap[prodId]) {
          productMap[prodId] = {
            productId: prodId,
            productName: item.productName,
            category: meta.category,
            unit: meta.unit,
            totalQuantity: 0,
            totalRevenue: 0,
            totalCost: 0,
            variantsMap: {},
          };
        }

        const pEntry = productMap[prodId];
        pEntry.totalQuantity += item.quantity;
        pEntry.totalRevenue += item.subtotal;
        pEntry.totalCost += item.subtotalCost;

        totalQty += item.quantity;
        totalRev += item.subtotal;
        totalCst += item.subtotalCost;

        // Group by selected variants
        const variantName = item.selectedVariants && item.selectedVariants.length > 0
          ? item.selectedVariants.map(v => v.name).join(', ')
          : 'Original / Standar';
        
        const varKey = variantName;

        if (!pEntry.variantsMap[varKey]) {
          pEntry.variantsMap[varKey] = {
            variantId: varKey,
            variantName,
            quantity: 0,
            revenue: 0,
            cost: 0,
          };
        }

        pEntry.variantsMap[varKey].quantity += item.quantity;
        pEntry.variantsMap[varKey].revenue += item.subtotal;
        pEntry.variantsMap[varKey].cost += item.subtotalCost;
      });
    });

    const totalPrf = totalRev - totalCst;

    const list: MenuSalesStat[] = Object.values(productMap).map(p => {
      const totalProfit = p.totalRevenue - p.totalCost;
      const marginPercent = p.totalRevenue > 0 ? (totalProfit / p.totalRevenue) * 100 : 0;
      const contributionPercent = totalRev > 0 ? (p.totalRevenue / totalRev) * 100 : 0;
      const avgPrice = p.totalQuantity > 0 ? p.totalRevenue / p.totalQuantity : 0;

      const variants: VariantSalesStat[] = Object.values(p.variantsMap)
        .map(v => ({
          variantId: v.variantId,
          variantName: v.variantName,
          quantity: v.quantity,
          revenue: v.revenue,
          cost: v.cost,
          profit: v.revenue - v.cost,
          avgPrice: v.quantity > 0 ? v.revenue / v.quantity : 0,
        }))
        .sort((a, b) => b.quantity - a.quantity);

      return {
        productId: p.productId,
        productName: p.productName,
        category: p.category,
        unit: p.unit,
        totalQuantity: p.totalQuantity,
        totalRevenue: p.totalRevenue,
        totalCost: p.totalCost,
        totalProfit,
        marginPercent,
        contributionPercent,
        avgPrice,
        variants,
      };
    });

    return {
      menuStatsList: list,
      overallTotalQty: totalQty,
      overallTotalRevenue: totalRev,
      overallTotalCost: totalCst,
      overallTotalProfit: totalPrf,
    };
  }, [activeTransactions, products]);

  // 4. Filter and Sort Menu Stats
  const filteredAndSortedMenuStats = useMemo(() => {
    let result = menuStatsList.filter(item => {
      const matchesSearch = item.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.variants.some(v => v.variantName.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesCat = selectedCategory === 'SEMUA' || item.category === selectedCategory;
      return matchesSearch && matchesCat;
    });

    result.sort((a, b) => {
      let valA = 0;
      let valB = 0;

      if (sortBy === 'QTY') {
        valA = a.totalQuantity;
        valB = b.totalQuantity;
      } else if (sortBy === 'REVENUE') {
        valA = a.totalRevenue;
        valB = b.totalRevenue;
      } else if (sortBy === 'PROFIT') {
        valA = a.totalProfit;
        valB = b.totalProfit;
      } else if (sortBy === 'NAME') {
        return sortOrder === 'ASC' 
          ? a.productName.localeCompare(b.productName) 
          : b.productName.localeCompare(a.productName);
      }

      return sortOrder === 'DESC' ? valB - valA : valA - valB;
    });

    return result;
  }, [menuStatsList, searchQuery, selectedCategory, sortBy, sortOrder]);

  // Unique categories in data
  const availableCategories = useMemo(() => {
    const cats = new Set<string>();
    menuStatsList.forEach(m => {
      if (m.category) cats.add(m.category);
    });
    return Array.from(cats);
  }, [menuStatsList]);

  // Expand / Collapse toggles
  const toggleExpand = (id: string) => {
    setExpandedProductIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const expandAll = () => {
    setExpandedProductIds(new Set(filteredAndSortedMenuStats.map(m => m.productId)));
  };

  const collapseAll = () => {
    setExpandedProductIds(new Set());
  };

  // Export to Excel
  const handleExportExcel = () => {
    const wb = XLSX.utils.book_new();

    // Sheet 1: Rangkuman Menu
    const menuRows: any[] = [];
    filteredAndSortedMenuStats.forEach((m, idx) => {
      menuRows.push({
        'No': idx + 1,
        'Nama Menu': m.productName,
        'Kategori': m.category,
        'Jumlah Terjual': m.totalQuantity,
        'Satuan': m.unit,
        'Harga Rata-rata': m.avgPrice,
        'Total Penjualan (Omzet)': m.totalRevenue,
        'Total Modal (HPP)': m.totalCost,
        'Laba Kotor': m.totalProfit,
        'Margin Laba (%)': `${m.marginPercent.toFixed(1)}%`,
        'Kontribusi Omzet (%)': `${m.contributionPercent.toFixed(1)}%`,
      });
    });

    const wsMenu = XLSX.utils.json_to_sheet(menuRows);
    XLSX.utils.book_append_sheet(wb, wsMenu, 'Penjualan Per Menu');

    // Sheet 2: Rincian Varian Menu Lengkap
    const variantRows: any[] = [];
    let vNo = 1;
    filteredAndSortedMenuStats.forEach(m => {
      m.variants.forEach(v => {
        variantRows.push({
          'No': vNo++,
          'Nama Menu': m.productName,
          'Kategori': m.category,
          'Varian Menu': v.variantName,
          'Jumlah Terjual': v.quantity,
          'Satuan': m.unit,
          'Harga Rata-rata Varian': v.avgPrice,
          'Total Penjualan': v.revenue,
          'Total Modal (HPP)': v.cost,
          'Laba Kotor': v.profit,
          'Margin Laba (%)': v.revenue > 0 ? `${((v.profit / v.revenue) * 100).toFixed(1)}%` : '0%',
        });
      });
    });

    const wsVariant = XLSX.utils.json_to_sheet(variantRows);
    XLSX.utils.book_append_sheet(wb, wsVariant, 'Rincian Varian Menu');

    XLSX.writeFile(wb, `Laporan_Penjualan_Menu_${storeSettings.storeName}_${periodLabel.replace(/[/\\?%*:|"<>]/g, '_')}.xlsx`);
  };

  // Export to PDF
  const handleExportPDF = () => {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    // Title
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(storeSettings.storeName.toUpperCase(), 14, 15);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`LAPORAN PENJUALAN PER MENU & VARIAN MENU`, 14, 21);
    doc.text(`Periode: ${periodLabel}`, 14, 26);
    doc.text(`Dicetak pada: ${new Date().toLocaleString('id-ID')}`, 14, 31);

    // Summary Box
    doc.setDrawColor(200, 200, 200);
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(14, 35, 182, 14, 2, 2, 'FD');

    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text(`Total Porsi Terjual: ${overallTotalQty.toLocaleString('id-ID')}`, 18, 43);
    doc.text(`Total Omzet: ${formatRupiah(overallTotalRevenue)}`, 75, 43);
    doc.text(`Laba Kotor: ${formatRupiah(overallTotalProfit)}`, 135, 43);

    // Table
    const tableBody: any[] = [];
    filteredAndSortedMenuStats.forEach((m, idx) => {
      tableBody.push([
        idx + 1,
        m.productName,
        m.category,
        `${m.totalQuantity} ${m.unit}`,
        formatRupiah(m.avgPrice),
        formatRupiah(m.totalRevenue),
        formatRupiah(m.totalProfit),
        `${m.marginPercent.toFixed(0)}%`,
      ]);

      // Add variant sub-rows
      if (m.variants.length > 0) {
        m.variants.forEach(v => {
          tableBody.push([
            '',
            `  ↳ Varian: ${v.variantName}`,
            '-',
            `${v.quantity} ${m.unit}`,
            formatRupiah(v.avgPrice),
            formatRupiah(v.revenue),
            formatRupiah(v.profit),
            v.revenue > 0 ? `${((v.profit / v.revenue) * 100).toFixed(0)}%` : '0%',
          ]);
        });
      }
    });

    autoTable(doc, {
      startY: 53,
      head: [['No', 'Menu / Varian', 'Kategori', 'Qty', 'Harga Avg', 'Omzet', 'Laba', 'Margin']],
      body: tableBody,
      theme: 'grid',
      headStyles: { fillColor: [15, 23, 42], textColor: 255, fontStyle: 'bold', fontSize: 8 },
      bodyStyles: { fontSize: 7.5 },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      columnStyles: {
        0: { cellWidth: 8, halign: 'center' },
        1: { cellWidth: 55 },
        2: { cellWidth: 25 },
        3: { cellWidth: 16, halign: 'right' },
        4: { cellWidth: 22, halign: 'right' },
        5: { cellWidth: 26, halign: 'right' },
        6: { cellWidth: 22, halign: 'right' },
        7: { cellWidth: 12, halign: 'center' },
      },
    });

    doc.save(`Laporan_Penjualan_Menu_${storeSettings.storeName}_${period}.pdf`);
  };

  // Copy Summary to WhatsApp
  const handleCopyWhatsAppSummary = () => {
    let text = `📊 *LAPORAN PENJUALAN PER MENU & VARIAN*\n`;
    text += `*${storeSettings.storeName}*\n`;
    text += `📅 Periode: ${periodLabel}\n`;
    text += `----------------------------------------\n`;
    text += `📦 Total Menu Terjual : *${overallTotalQty.toLocaleString('id-ID')} item/porsi*\n`;
    text += `💰 Total Omzet        : *${formatRupiah(overallTotalRevenue)}*\n`;
    text += `📈 Total Laba Kotor   : *${formatRupiah(overallTotalProfit)}*\n`;
    text += `----------------------------------------\n`;
    text += `*RINCIAN MENU TERJUAL:*\n\n`;

    filteredAndSortedMenuStats.forEach((m, idx) => {
      text += `${idx + 1}. *${m.productName}* (${m.category})\n`;
      text += `   • Terjual : ${m.totalQuantity} ${m.unit} | Omzet: ${formatRupiah(m.totalRevenue)} (Laba: ${formatRupiah(m.totalProfit)})\n`;
      if (m.variants.length > 0) {
        m.variants.forEach(v => {
          text += `     - ${v.variantName}: ${v.quantity} ${m.unit} = ${formatRupiah(v.revenue)}\n`;
        });
      }
      text += `\n`;
    });

    text += `----------------------------------------\n`;
    text += `_Laporan otomatis HannaBee POS & Pembukuan Warung_`;

    navigator.clipboard.writeText(text);
    setCopiedWa(true);
    setTimeout(() => setCopiedWa(false), 2500);
  };

  return (
    <div className="max-w-7xl mx-auto p-3 sm:p-5 space-y-5">
      
      {/* 1. Top Header & Period Selector */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center font-bold">
              <UtensilsCrossed size={20} />
            </span>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                <span>Laporan Penjualan Harian per Menu & Varian</span>
                <span className="text-[11px] font-semibold bg-amber-100 text-amber-900 px-2 py-0.5 rounded-full border border-amber-200">
                  {periodLabel}
                </span>
              </h2>
              <p className="text-xs text-slate-500">
                Pantau volume porsi terjual, omzet, modal HPP, dan rincian varian menu secara transparan.
              </p>
            </div>
          </div>

          {/* Quick Action Export Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              id="menu-report-export-excel"
              onClick={handleExportExcel}
              className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-2xs"
              title="Unduh data penjualan menu & varian ke Excel"
            >
              <FileSpreadsheet size={14} className="text-emerald-700" />
              <span>Ekspor Excel</span>
            </button>

            <button
              id="menu-report-export-pdf"
              onClick={handleExportPDF}
              className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-2xs"
              title="Cetak format PDF rapi"
            >
              <FileText size={14} className="text-slate-300" />
              <span>Cetak PDF</span>
            </button>

            <button
              id="menu-report-copy-wa"
              onClick={handleCopyWhatsAppSummary}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-2xs"
              title="Salin rekap ke teks WhatsApp"
            >
              {copiedWa ? <Check size={14} /> : <Copy size={14} />}
              <span>{copiedWa ? 'Tersalin!' : 'Salin ke WA'}</span>
            </button>
          </div>
        </div>

        {/* Period Selector Tabs */}
        <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-1.5">
            {[
              { id: 'TODAY' as MenuReportPeriod, label: 'Hari Ini (Harian)' },
              { id: 'YESTERDAY' as MenuReportPeriod, label: 'Kemarin' },
              { id: '7_DAYS' as MenuReportPeriod, label: '7 Hari' },
              { id: '30_DAYS' as MenuReportPeriod, label: '30 Hari' },
              { id: 'THIS_MONTH' as MenuReportPeriod, label: 'Bulan Ini' },
              { id: 'CUSTOM' as MenuReportPeriod, label: 'Pilih Tanggal' },
            ].map(tab => (
              <button
                key={tab.id}
                id={`menu-period-${tab.id}`}
                onClick={() => setPeriod(tab.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                  period === tab.id
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <Calendar size={13} />
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Custom Date Range Picker */}
          {period === 'CUSTOM' && (
            <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-xl border border-slate-200 text-xs">
              <input
                type="date"
                value={customStartDate}
                onChange={e => setCustomStartDate(e.target.value)}
                className="px-2 py-1 bg-white border border-slate-300 rounded-lg text-xs font-medium focus:ring-1 focus:ring-amber-500"
              />
              <span className="text-slate-400 font-bold">s/d</span>
              <input
                type="date"
                value={customEndDate}
                onChange={e => setCustomEndDate(e.target.value)}
                className="px-2 py-1 bg-white border border-slate-300 rounded-lg text-xs font-medium focus:ring-1 focus:ring-amber-500"
              />
            </div>
          )}
        </div>
      </div>

      {/* 2. Top Summary KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col justify-between">
          <span className="text-[11px] font-semibold text-slate-500 flex items-center gap-1">
            <ShoppingBag size={13} className="text-amber-500" />
            <span>Total Item/Porsi Terjual</span>
          </span>
          <div className="mt-2">
            <div className="text-xl sm:text-2xl font-black text-slate-900">
              {overallTotalQty.toLocaleString('id-ID')} <span className="text-xs font-medium text-slate-500">item</span>
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5">
              Dari {filteredAndSortedMenuStats.length} jenis menu aktif
            </p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col justify-between">
          <span className="text-[11px] font-semibold text-slate-500 flex items-center gap-1">
            <TrendingUp size={13} className="text-emerald-500" />
            <span>Total Omzet Penjualan</span>
          </span>
          <div className="mt-2">
            <div className="text-xl sm:text-2xl font-black text-emerald-600">
              {formatRupiah(overallTotalRevenue)}
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5">
              Total bruto penjualan menu
            </p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col justify-between">
          <span className="text-[11px] font-semibold text-slate-500 flex items-center gap-1">
            <Layers size={13} className="text-rose-500" />
            <span>Total Modal / HPP</span>
          </span>
          <div className="mt-2">
            <div className="text-xl sm:text-2xl font-black text-slate-700">
              {formatRupiah(overallTotalCost)}
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5">
              Beban bahan baku terpakai
            </p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-blue-200 bg-blue-50/30 shadow-2xs flex flex-col justify-between">
          <span className="text-[11px] font-semibold text-blue-900 flex items-center gap-1">
            <Award size={13} className="text-blue-600" />
            <span>Total Laba Kotor</span>
          </span>
          <div className="mt-2">
            <div className="text-xl sm:text-2xl font-black text-blue-700">
              {formatRupiah(overallTotalProfit)}
            </div>
            <p className="text-[10px] text-blue-600/80 mt-0.5 font-semibold">
              Margin Rata-rata: {overallTotalRevenue > 0 ? ((overallTotalProfit / overallTotalRevenue) * 100).toFixed(1) : 0}%
            </p>
          </div>
        </div>
      </div>

      {/* 3. Search, Filter Category & Sort Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          
          {/* Search Input */}
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
            <input
              id="search-menu-sales-input"
              type="text"
              placeholder="Cari nama menu atau varian..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          {/* Filter Controls */}
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
            {/* Category Select */}
            <div className="flex items-center gap-1.5 text-xs bg-slate-50 px-2.5 py-1.5 rounded-xl border border-slate-200">
              <span className="text-slate-500 font-semibold">Kategori:</span>
              <select
                value={selectedCategory}
                onChange={e => setSelectedCategory(e.target.value)}
                className="bg-transparent text-slate-800 font-bold focus:outline-none cursor-pointer"
              >
                <option value="SEMUA">Semua Kategori</option>
                {availableCategories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            {/* Sort Order Select */}
            <div className="flex items-center gap-1.5 text-xs bg-slate-50 px-2.5 py-1.5 rounded-xl border border-slate-200">
              <span className="text-slate-500 font-semibold">Urutkan:</span>
              <select
                value={`${sortBy}_${sortOrder}`}
                onChange={e => {
                  const [b, o] = e.target.value.split('_');
                  setSortBy(b as any);
                  setSortOrder(o as any);
                }}
                className="bg-transparent text-slate-800 font-bold focus:outline-none cursor-pointer"
              >
                <option value="QTY_DESC">Porsi Terbanyak ↓</option>
                <option value="QTY_ASC">Porsi Tersedikit ↑</option>
                <option value="REVENUE_DESC">Omzet Tertinggi ↓</option>
                <option value="PROFIT_DESC">Laba Tertinggi ↓</option>
                <option value="NAME_ASC">Nama Menu (A-Z)</option>
              </select>
            </div>

            {/* Expand / Collapse All */}
            <div className="flex items-center gap-1">
              <button
                onClick={expandAll}
                className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-bold transition"
                title="Buka semua rincian varian"
              >
                Buka Varian
              </button>
              <button
                onClick={collapseAll}
                className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-bold transition"
                title="Tutup rincian varian"
              >
                Tutup Varian
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Sales Table per Menu & Varian */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        {filteredAndSortedMenuStats.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-14 h-14 bg-amber-50 text-amber-500 rounded-2xl flex items-center justify-center mx-auto">
              <UtensilsCrossed size={28} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800">Tidak Ada Data Penjualan Menu</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                Belum ada transaksi penjualan produk yang tercatat pada periode <span className="font-semibold">{periodLabel}</span>. Silakan lakukan transaksi kasir atau ganti pilihan rentang tanggal.
              </p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900 text-white font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4 w-10 text-center">#</th>
                  <th className="py-3 px-4">Nama Menu & Rincian Varian</th>
                  <th className="py-3 px-3 text-center">Kategori</th>
                  <th className="py-3 px-3 text-right">Jumlah Terjual</th>
                  <th className="py-3 px-3 text-right">Harga Rata-rata</th>
                  <th className="py-3 px-3 text-right">Total Omzet</th>
                  <th className="py-3 px-3 text-right">Modal (HPP)</th>
                  <th className="py-3 px-3 text-right">Laba Kotor</th>
                  <th className="py-3 px-3 text-center">Margin</th>
                  <th className="py-3 px-4 text-center">Kontribusi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredAndSortedMenuStats.map((item, index) => {
                  const isExpanded = expandedProductIds.has(item.productId);
                  const hasVariants = item.variants.length > 0;

                  return (
                    <React.Fragment key={item.productId}>
                      {/* Main Product Row */}
                      <tr className="hover:bg-amber-50/30 transition group font-medium text-slate-800">
                        <td className="py-3 px-4 text-center text-slate-400 font-mono text-[11px]">
                          {index + 1}
                        </td>
                        
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => toggleExpand(item.productId)}
                              className={`p-1 rounded-md transition ${
                                isExpanded ? 'bg-amber-100 text-amber-800' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
                              }`}
                              title={isExpanded ? 'Sembunyikan Varian' : 'Lihat Varian'}
                            >
                              {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                            </button>
                            <div>
                              <div className="font-bold text-slate-900 flex items-center gap-2">
                                <span>{item.productName}</span>
                                {item.variants.length > 1 && (
                                  <span className="text-[10px] font-semibold bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded-md">
                                    {item.variants.length} Varian
                                  </span>
                                )}
                              </div>
                              <div className="text-[10px] text-slate-400">
                                Satuan: {item.unit || 'porsi'}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="py-3 px-3 text-center">
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md text-[10px] font-semibold">
                            {item.category}
                          </span>
                        </td>

                        <td className="py-3 px-3 text-right">
                          <span className="font-black text-sm text-slate-900">
                            {item.totalQuantity}
                          </span>
                          <span className="text-[10px] text-slate-400 ml-1">{item.unit}</span>
                        </td>

                        <td className="py-3 px-3 text-right font-mono text-slate-600">
                          {formatRupiah(item.avgPrice)}
                        </td>

                        <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">
                          {formatRupiah(item.totalRevenue)}
                        </td>

                        <td className="py-3 px-3 text-right font-mono text-slate-500">
                          {formatRupiah(item.totalCost)}
                        </td>

                        <td className="py-3 px-3 text-right font-mono font-bold text-emerald-700">
                          {formatRupiah(item.totalProfit)}
                        </td>

                        <td className="py-3 px-3 text-center">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            item.marginPercent >= 50
                              ? 'bg-emerald-100 text-emerald-800'
                              : item.marginPercent >= 30
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}>
                            {item.marginPercent.toFixed(0)}%
                          </span>
                        </td>

                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <div className="w-12 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                              <div
                                className="bg-amber-500 h-full rounded-full"
                                style={{ width: `${Math.min(100, item.contributionPercent)}%` }}
                              />
                            </div>
                            <span className="text-[10px] text-slate-500 font-bold font-mono">
                              {item.contributionPercent.toFixed(1)}%
                            </span>
                          </div>
                        </td>
                      </tr>

                      {/* Variant Sub-rows when Expanded */}
                      {isExpanded && (
                        <tr className="bg-amber-50/40 border-y border-amber-200/60">
                          <td colSpan={10} className="py-2.5 px-6">
                            <div className="pl-6 border-l-2 border-amber-400 space-y-2">
                              <div className="text-[11px] font-bold text-amber-950 flex items-center gap-1.5">
                                <Layers size={13} className="text-amber-600" />
                                <span>Rincian Penjualan Masing-Masing Varian Menu:</span>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 pt-1">
                                {item.variants.map((v, vIdx) => (
                                  <div
                                    key={vIdx}
                                    className="bg-white p-3 rounded-xl border border-amber-200 shadow-2xs flex flex-col justify-between space-y-1.5"
                                  >
                                    <div className="flex items-start justify-between gap-2">
                                      <div>
                                        <div className="font-bold text-xs text-slate-900">
                                          {v.variantName}
                                        </div>
                                        <div className="text-[10px] text-slate-400 font-mono">
                                          Harga Rata-rata: {formatRupiah(v.avgPrice)}
                                        </div>
                                      </div>
                                      <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 font-bold text-xs">
                                        {v.quantity} {item.unit}
                                      </span>
                                    </div>

                                    <div className="pt-1.5 border-t border-slate-100 flex items-center justify-between text-[11px]">
                                      <div>
                                        <span className="text-slate-400 text-[10px]">Omzet: </span>
                                        <span className="font-bold font-mono text-slate-800">{formatRupiah(v.revenue)}</span>
                                      </div>
                                      <div>
                                        <span className="text-slate-400 text-[10px]">Laba: </span>
                                        <span className="font-bold font-mono text-emerald-700">{formatRupiah(v.profit)}</span>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>

              {/* Table Footer Total */}
              <tfoot className="bg-slate-100 border-t-2 border-slate-300 font-black text-slate-900">
                <tr>
                  <td colSpan={3} className="py-3 px-4 text-left">
                    TOTAL KESELURUHAN ({filteredAndSortedMenuStats.length} MENU)
                  </td>
                  <td className="py-3 px-3 text-right text-sm">
                    {overallTotalQty.toLocaleString('id-ID')}
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-xs">
                    {overallTotalQty > 0 ? formatRupiah(overallTotalRevenue / overallTotalQty) : '-'}
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-sm text-emerald-800">
                    {formatRupiah(overallTotalRevenue)}
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-xs text-slate-600">
                    {formatRupiah(overallTotalCost)}
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-sm text-blue-800">
                    {formatRupiah(overallTotalProfit)}
                  </td>
                  <td className="py-3 px-3 text-center">
                    <span className="px-1.5 py-0.5 bg-blue-100 text-blue-900 rounded text-[10px]">
                      {overallTotalRevenue > 0 ? ((overallTotalProfit / overallTotalRevenue) * 100).toFixed(0) : 0}%
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center font-mono">
                    100%
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

    </div>
  );
};
