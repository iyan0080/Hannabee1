import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Transaction, Expense, ProfitLossSummary, Customer, Product, StoreSettings, JournalEntryItem, CashFlowSummary, CashClosingRecord } from '../types';
import { formatDate, formatDateOnly, formatRupiah } from './format';

// 1. Export Transactions to Excel
export function exportTransactionsToExcel(transactions: Transaction[], store: StoreSettings) {
  const data = transactions.map((t, idx) => ({
    'No': idx + 1,
    'No. Nota': t.invoiceNumber,
    'Tanggal & Waktu': formatDate(t.timestamp),
    'Pelanggan': t.customerName || 'Umum',
    'No. Telepon': t.customerPhone || '-',
    'Jumlah Item': t.items.reduce((acc, item) => acc + item.quantity, 0),
    'Rincian Menu': t.items.map(i => `${i.productName} (${i.quantity}x)`).join('; '),
    'Subtotal': t.subtotal,
    'Diskon': t.discount,
    'Pajak': t.tax,
    'Total Penjualan': t.finalAmount,
    'Total Diretur': t.totalReturnedAmount || 0,
    'Penjualan Bersih (Net)': t.status === 'BATAL' ? 0 : Math.max(0, t.finalAmount - (t.totalReturnedAmount || 0)),
    'Total HPP (Modal)': t.totalCost,
    'Laba Kotor': t.status === 'BATAL' ? 0 : Math.max(0, t.grossProfit - (t.totalReturnedAmount || 0) + (t.totalReturnedCost || 0)),
    'Metode Pembayaran': t.paymentMethod,
    'Status Transaksi': t.status,
    'Keterangan Batal / Retur': t.cancellationReason || (t.returnRecords ? t.returnRecords.map(r => `[${r.type}] ${r.reason}`).join(' | ') : '-'),
    'Kasir': t.cashierName,
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Penjualan');
  
  const dateStr = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(workbook, `Laporan_Penjualan_${store.storeName.replace(/\s+/g, '_')}_${dateStr}.xlsx`);
}

// 2. Export Expenses to Excel
export function exportExpensesToExcel(expenses: Expense[], store: StoreSettings) {
  const data = expenses.map((e, idx) => ({
    'No': idx + 1,
    'Tanggal & Waktu': formatDate(e.timestamp),
    'Kategori Pengeluaran': e.category,
    'Judul / Keperluan': e.title,
    'Jumlah (Rp)': e.amount,
    'Metode Bayar': e.paymentMethod,
    'Penerima / Toko': e.recipient || '-',
    'Catatan': e.notes || '-',
    'Dicatat Oleh': e.cashierName || '-',
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Pengeluaran');
  
  const dateStr = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(workbook, `Laporan_Pengeluaran_${store.storeName.replace(/\s+/g, '_')}_${dateStr}.xlsx`);
}

// 3. Export Profit & Loss to Excel
export function exportProfitLossToExcel(summary: ProfitLossSummary, store: StoreSettings) {
  const rows = [
    { 'Kategori Laporan': 'Nama Usaha', 'Nilai': store.storeName },
    { 'Kategori Laporan': 'Periode Laporan', 'Nilai': summary.periodLabel },
    { 'Kategori Laporan': 'Rentang Tanggal', 'Nilai': `${formatDateOnly(summary.startDate)} s/d ${formatDateOnly(summary.endDate)}` },
    { 'Kategori Laporan': 'Total Transaksi', 'Nilai': summary.transactionCount },
    { 'Kategori Laporan': 'Rata-rata Nilai Transaksi', 'Nilai': summary.averageTransactionValue },
    { 'Kategori Laporan': '--------------------', 'Nilai': '--------------------' },
    { 'Kategori Laporan': '1. Total Penjualan (Omzet)', 'Nilai': summary.totalSales },
    { 'Kategori Laporan': '2. Harga Pokok Penjualan (HPP/Modal)', 'Nilai': summary.totalCostOfGoods },
    { 'Kategori Laporan': '3. Laba Kotor (Gross Profit)', 'Nilai': summary.grossProfit },
    { 'Kategori Laporan': '   Margin Laba Kotor (%)', 'Nilai': `${summary.grossMargin.toFixed(1)}%` },
    { 'Kategori Laporan': '--------------------', 'Nilai': '--------------------' },
    { 'Kategori Laporan': '4. Total Beban Operasional & Pengeluaran', 'Nilai': summary.totalExpenses },
  ];

  // Add expense breakdown
  Object.entries(summary.expenseBreakdown).forEach(([cat, amount]) => {
    rows.push({
      'Kategori Laporan': `   - Beban: ${cat}`,
      'Nilai': amount || 0
    });
  });

  rows.push(
    { 'Kategori Laporan': '--------------------', 'Nilai': '--------------------' },
    { 'Kategori Laporan': '5. LABA BERSIH (NET PROFIT)', 'Nilai': summary.netProfit },
    { 'Kategori Laporan': '   Margin Laba Bersih (%)', 'Nilai': `${summary.netMargin.toFixed(1)}%` },
    { 'Kategori Laporan': '6. Total Kasbon Belum Lunas', 'Nilai': summary.unpaidDebtTotal }
  );

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Laba_Rugi');
  
  const dateStr = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(workbook, `Laporan_Laba_Rugi_${store.storeName.replace(/\s+/g, '_')}_${dateStr}.xlsx`);
}

// 4. Export Customers to Excel
export function exportCustomersToExcel(customers: Customer[], store: StoreSettings) {
  const data = customers.map((c, idx) => ({
    'No': idx + 1,
    'Nama Pelanggan': c.name,
    'Tipe Pelanggan': c.customerType === 'RESELLER' ? 'RESELLER' : 'UMUM',
    'Nama Toko / Usaha': c.storeName || '-',
    'Diskon Reseller': c.customerType === 'RESELLER' 
      ? (c.resellerDiscountType === 'PERCENTAGE' 
          ? `${c.resellerDiscountValue || 0}%` 
          : formatRupiah(c.resellerDiscountValue || 0))
      : '-',
    'Nomor WhatsApp': c.phone,
    'Alamat': c.address || '-',
    'Saldo Deposit (Rp)': c.depositBalance || 0,
    'Kasbon Aktif (Rp)': c.totalDebt || 0,
    'Total Transaksi': c.totalTransactions,
    'Total Belanja (Rp)': c.totalSpent,
    'Terdaftar Sejak': formatDateOnly(c.createdAt),
    'Catatan': c.notes || '-',
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Database_Pelanggan');
  
  const dateStr = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(workbook, `Database_Pelanggan_${store.storeName.replace(/\s+/g, '_')}_${dateStr}.xlsx`);
}

// 5. Export Products to Excel
export function exportProductsToExcel(products: Product[], store: StoreSettings) {
  const data = products.map((p, idx) => ({
    'No': idx + 1,
    'Nama Produk / Menu': p.name,
    'Kategori': p.category,
    'Harga Jual Dasar': p.basePrice,
    'HPP (Modal Dasar)': p.baseCost,
    'Estimasi Margin/Unit': p.basePrice - p.baseCost,
    'Stok Saat Ini': p.stock,
    'Satuan': p.unit,
    'Varian': p.variants.map(v => `${v.name} (+Rp ${v.priceAdjustment})`).join(', ') || '-',
    'Status': p.isAvailable ? 'Tersedia' : 'Habis/Nonaktif',
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Katalog_Produk');
  
  const dateStr = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(workbook, `Daftar_Menu_Produk_${store.storeName.replace(/\s+/g, '_')}_${dateStr}.xlsx`);
}

// 6. Export Profit & Loss Report to PDF
export function exportProfitLossToPDF(summary: ProfitLossSummary, store: StoreSettings) {
  const doc = new jsPDF();

  // Header
  doc.setFontSize(18);
  doc.setTextColor(20, 40, 60);
  doc.text(store.storeName, 14, 20);
  
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text(`${store.address} | Telp: ${store.phone}`, 14, 26);
  doc.text(`LAPORAN LABA RUGI (INCOME STATEMENT)`, 14, 34);
  doc.text(`Periode: ${summary.periodLabel} (${formatDateOnly(summary.startDate)} - ${formatDateOnly(summary.endDate)})`, 14, 40);
  doc.text(`Dicetak pada: ${formatDate(new Date().toISOString())}`, 14, 46);

  doc.setDrawColor(200, 200, 200);
  doc.line(14, 49, 196, 49);

  // Table Data
  const tableRows = [
    ['1. PENDAPATAN USAHA (OMZET)', ''],
    ['   Total Penjualan Produk', formatRupiah(summary.totalSales)],
    ['   Jumlah Transaksi Sukses', `${summary.transactionCount} Transaksi`],
    ['   Rata-Rata Transaksi', formatRupiah(summary.averageTransactionValue)],
    ['', ''],
    ['2. HARGA POKOK PENJUALAN (HPP / MODAL)', ''],
    ['   Total HPP Bahan Baku & Stok', `(${formatRupiah(summary.totalCostOfGoods)})`],
    ['', ''],
    ['3. LABA KOTOR (GROSS PROFIT)', formatRupiah(summary.grossProfit)],
    ['   Margin Laba Kotor', `${summary.grossMargin.toFixed(1)}%`],
    ['', ''],
    ['4. BEBAN PENGELUARAN OPERASIONAL', ''],
  ];

  Object.entries(summary.expenseBreakdown).forEach(([category, amount]) => {
    if (amount && amount > 0) {
      tableRows.push([`   - ${category}`, `(${formatRupiah(amount)})`]);
    }
  });

  tableRows.push(
    ['   TOTAL BEBAN OPERASIONAL', `(${formatRupiah(summary.totalExpenses)})`],
    ['', ''],
    ['5. LABA BERSIH (NET PROFIT)', formatRupiah(summary.netProfit)],
    ['   Margin Laba Bersih', `${summary.netMargin.toFixed(1)}%`],
    ['', ''],
    ['CATATAN PIUTANG (KASBON)', ''],
    ['   Sisa Kasbon Belum Lunas', formatRupiah(summary.unpaidDebtTotal)]
  );

  autoTable(doc, {
    startY: 53,
    head: [['Komponen Keuangan', 'Jumlah (IDR)']],
    body: tableRows,
    theme: 'grid',
    headStyles: { fillColor: [30, 41, 59], textColor: 255, fontStyle: 'bold' },
    styles: { fontSize: 9.5, cellPadding: 3.5 },
    columnStyles: {
      0: { cellWidth: 120 },
      1: { cellWidth: 62, halign: 'right', fontStyle: 'bold' },
    },
  });

  // Footer Signature area
  const finalY = (doc as any).lastAutoTable.finalY + 15;
  if (finalY < 250) {
    doc.setFontSize(9);
    doc.text('Dibuat & Diverifikasi Oleh:', 140, finalY);
    doc.text('( ' + store.cashierName + ' )', 140, finalY + 22);
    doc.text('Pemilik / Pengelola Warung', 140, finalY + 27);
  }

  doc.save(`Laporan_Laba_Rugi_${store.storeName.replace(/\s+/g, '_')}.pdf`);
}

// 7. Export Transactions to PDF
export function exportTransactionsToPDF(transactions: Transaction[], store: StoreSettings, periodTitle = 'Laporan Transaksi') {
  const doc = new jsPDF('landscape');

  doc.setFontSize(16);
  doc.setTextColor(20, 40, 60);
  doc.text(store.storeName + ' - ' + periodTitle, 14, 16);
  
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.text(`Waktu Cetak: ${formatDate(new Date().toISOString())} | Total Data: ${transactions.length} transaksi`, 14, 22);

  const tableRows = transactions.map((t, idx) => [
    idx + 1,
    t.invoiceNumber,
    formatDate(t.timestamp),
    t.customerName || 'Umum',
    t.items.map(i => `${i.productName} (${i.quantity})`).join(', '),
    formatRupiah(t.finalAmount),
    formatRupiah(t.totalCost),
    formatRupiah(t.grossProfit),
    t.paymentMethod,
    t.status,
  ]);

  autoTable(doc, {
    startY: 26,
    head: [['No', 'Nota', 'Tanggal', 'Pelanggan', 'Item Menu', 'Total (Rp)', 'HPP (Rp)', 'Laba (Rp)', 'Metode', 'Status']],
    body: tableRows,
    theme: 'striped',
    headStyles: { fillColor: [15, 118, 110], fontSize: 8 },
    styles: { fontSize: 7.5, cellPadding: 2 },
  });

  doc.save(`Daftar_Transaksi_${store.storeName.replace(/\s+/g, '_')}.pdf`);
}

// 8. Export General Cash Ledger (Buku Kas & Jurnal Umum) to Excel
export function exportBookkeepingToExcel(entries: JournalEntryItem[], store: StoreSettings, periodLabel = 'Semua Periode') {
  const data = entries.map((e, idx) => ({
    'No': idx + 1,
    'Tanggal & Waktu': formatDate(e.timestamp),
    'Tipe': e.type === 'KAS_MASUK' ? 'Kas Masuk (Debit)' : 'Kas Keluar (Kredit)',
    'Kategori': e.category,
    'Keterangan Transaksi': e.title,
    'Akun / Saluran Kas': e.accountLabel,
    'Pemasukan (Rp)': e.type === 'KAS_MASUK' ? e.amount : 0,
    'Pengeluaran (Rp)': e.type === 'KAS_KELUAR' ? e.amount : 0,
    'Saldo Berjalan (Rp)': e.runningBalance ?? 0,
    'Petugas / Kasir': e.actorName || '-',
    'Catatan / Referensi': e.notes || '-',
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Buku_Kas_Jurnal');

  const dateStr = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(workbook, `Buku_Kas_${store.storeName.replace(/\s+/g, '_')}_${dateStr}.xlsx`);
}

// 9. Export General Cash Ledger (Buku Kas & Jurnal) to PDF
export function exportBookkeepingToPDF(entries: JournalEntryItem[], store: StoreSettings, periodLabel = 'Semua Periode') {
  const doc = new jsPDF('landscape');

  doc.setFontSize(16);
  doc.setTextColor(20, 40, 60);
  doc.text(`${store.storeName} - Buku Kas & Jurnal Pembukuan`, 14, 16);

  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.text(`Periode: ${periodLabel} | Waktu Cetak: ${formatDate(new Date().toISOString())} | Total: ${entries.length} baris mutasi`, 14, 22);

  const totalIn = entries.filter(e => e.type === 'KAS_MASUK').reduce((acc, curr) => acc + curr.amount, 0);
  const totalOut = entries.filter(e => e.type === 'KAS_KELUAR').reduce((acc, curr) => acc + curr.amount, 0);
  const netBalance = totalIn - totalOut;

  doc.text(`Total Kas Masuk: ${formatRupiah(totalIn)} | Total Kas Keluar: ${formatRupiah(totalOut)} | Selisih Bersih: ${formatRupiah(netBalance)}`, 14, 28);

  const tableRows = entries.map((e, idx) => [
    idx + 1,
    formatDate(e.timestamp),
    e.type === 'KAS_MASUK' ? 'MASUK' : 'KELUAR',
    e.category,
    e.title,
    e.accountLabel,
    e.type === 'KAS_MASUK' ? formatRupiah(e.amount) : '-',
    e.type === 'KAS_KELUAR' ? formatRupiah(e.amount) : '-',
    e.runningBalance !== undefined ? formatRupiah(e.runningBalance) : '-',
    e.actorName || '-',
  ]);

  autoTable(doc, {
    startY: 32,
    head: [['No', 'Tanggal', 'Tipe', 'Kategori', 'Keterangan', 'Akun', 'Masuk (Rp)', 'Keluar (Rp)', 'Saldo (Rp)', 'Petugas']],
    body: tableRows,
    theme: 'striped',
    headStyles: { fillColor: [30, 41, 59], fontSize: 8 },
    styles: { fontSize: 7, cellPadding: 2 },
    columnStyles: {
      6: { halign: 'right' },
      7: { halign: 'right' },
      8: { halign: 'right', fontStyle: 'bold' },
    },
  });

  doc.save(`Buku_Kas_${store.storeName.replace(/\s+/g, '_')}.pdf`);
}

// 10. Export Cash Flow Statement (Laporan Arus Kas) to PDF
export function exportCashFlowToPDF(cashFlow: CashFlowSummary, store: StoreSettings) {
  const doc = new jsPDF();

  doc.setFontSize(16);
  doc.setTextColor(30, 41, 59);
  doc.text(store.storeName, 14, 16);

  doc.setFontSize(13);
  doc.setTextColor(71, 85, 105);
  doc.text('Laporan Arus Kas (Cash Flow Statement)', 14, 23);

  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text(`Periode: ${cashFlow.periodLabel} (${formatDateOnly(cashFlow.startDate)} s/d ${formatDateOnly(cashFlow.endDate)})`, 14, 30);
  doc.text(`Waktu Cetak: ${formatDate(new Date().toISOString())}`, 14, 35);

  const tableRows = [
    ['SALDO KAS AWAL PERIODE', formatRupiah(cashFlow.initialCashBalance)],
    ['', ''],
    ['A. ARUS KAS DARI AKTIVITAS OPERASIONAL', ''],
    ['   (+) Penjualan Kasir (Tunai)', formatRupiah(cashFlow.operatingInflows.salesCash)],
    ['   (+) Penjualan Kasir (Non-Tunai / QRIS / Transfer)', formatRupiah(cashFlow.operatingInflows.salesNonCash)],
    ['   (+) Penerimaan Pelunasan Kasbon Pelanggan', formatRupiah(cashFlow.operatingInflows.debtSettlements)],
    ['   (+) Penerimaan Top-Up Saldo Deposit Pelanggan', formatRupiah(cashFlow.operatingInflows.depositTopUps)],
    ['   (+) Pendapatan Operasional Lainnya', formatRupiah(cashFlow.operatingInflows.otherOperating)],
    ['   Total Penerimaan Kas Operasional', formatRupiah(cashFlow.operatingInflows.total)],
    ['   (-) Pembayaran Belanja Bahan Baku', `(${formatRupiah(cashFlow.operatingOutflows.materials)})`],
    ['   (-) Pembayaran Listrik, Gas & Beban Operasional', `(${formatRupiah(cashFlow.operatingOutflows.operationalUtilities)})`],
    ['   (-) Pembayaran Gaji & Upah Karyawan', `(${formatRupiah(cashFlow.operatingOutflows.salaries)})`],
    ['   (-) Pembayaran Sewa Tempat & Bangunan', `(${formatRupiah(cashFlow.operatingOutflows.rent)})`],
    ['   (-) Pembelian Perlengkapan & Kemasan', `(${formatRupiah(cashFlow.operatingOutflows.packaging)})`],
    ['   (-) Beban Pengeluaran Operasional Lain-lain', `(${formatRupiah(cashFlow.operatingOutflows.otherExpenses)})`],
    ['   Total Pengeluaran Kas Operasional', `(${formatRupiah(cashFlow.operatingOutflows.total)})`],
    ['   ARUS KAS BERSIH DARI AKTIVITAS OPERASIONAL', formatRupiah(cashFlow.netOperatingCashFlow)],
    ['', ''],
    ['B. ARUS KAS DARI AKTIVITAS INVESTASI', ''],
    ['   (-) Pembelian Peralatan & Aset Warung', `(${formatRupiah(cashFlow.investingOutflows.assetsAndEquipment)})`],
    ['   ARUS KAS BERSIH DARI AKTIVITAS INVESTASI', formatRupiah(cashFlow.netInvestingCashFlow)],
    ['', ''],
    ['C. ARUS KAS DARI AKTIVITAS PENDANAAN', ''],
    ['   (+) Setoran Modal Usaha Pemilik', formatRupiah(cashFlow.financingInflows.capitalInjections)],
    ['   (-) Prive / Penarikan Kas Pemilik', `(${formatRupiah(cashFlow.financingOutflows.ownerDrawingsPrive)})`],
    ['   ARUS KAS BERSIH DARI AKTIVITAS PENDANAAN', formatRupiah(cashFlow.netFinancingCashFlow)],
    ['', ''],
    ['KENAIKAN / (PENURUNAN) KAS BERSIH', formatRupiah(cashFlow.netCashChange)],
    ['SALDO KAS AKHIR PERIODE', formatRupiah(cashFlow.endingCashBalance)],
  ];

  autoTable(doc, {
    startY: 42,
    head: [['Pos Rekapitulasi Arus Kas', 'Jumlah (IDR)']],
    body: tableRows,
    theme: 'grid',
    headStyles: { fillColor: [15, 118, 110], textColor: 255, fontStyle: 'bold' },
    styles: { fontSize: 8.5, cellPadding: 2.5 },
    columnStyles: {
      0: { cellWidth: 130 },
      1: { cellWidth: 50, halign: 'right', fontStyle: 'bold' },
    },
  });

  doc.save(`Laporan_Arus_Kas_${store.storeName.replace(/\s+/g, '_')}.pdf`);
}

// 11. Export Cash Closing Record (Tutup Kas Harian) to PDF
export function exportCashClosingToPDF(closing: CashClosingRecord, store: StoreSettings) {
  const doc = new jsPDF();

  doc.setFontSize(16);
  doc.setTextColor(30, 41, 59);
  doc.text(store.storeName, 14, 16);

  doc.setFontSize(12);
  doc.setTextColor(71, 85, 105);
  doc.text('Berita Acara Rekap Tutup Kas Kasir (Cash Drawer Opname)', 14, 23);

  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text(`Tanggal & Waktu: ${formatDate(closing.timestamp)} | Kasir: ${closing.cashierName}`, 14, 29);

  const denomRows = [
    ['Pecahan Rp 100.000', `${closing.denominations.k100000} lembar`, formatRupiah(closing.denominations.k100000 * 100000)],
    ['Pecahan Rp 50.000', `${closing.denominations.k50000} lembar`, formatRupiah(closing.denominations.k50000 * 50000)],
    ['Pecahan Rp 20.000', `${closing.denominations.k20000} lembar`, formatRupiah(closing.denominations.k20000 * 20000)],
    ['Pecahan Rp 10.000', `${closing.denominations.k10000} lembar`, formatRupiah(closing.denominations.k10000 * 10000)],
    ['Pecahan Rp 5.000', `${closing.denominations.k5000} lembar`, formatRupiah(closing.denominations.k5000 * 5000)],
    ['Pecahan Rp 2.000', `${closing.denominations.k2000} lembar`, formatRupiah(closing.denominations.k2000 * 2000)],
    ['Pecahan Rp 1.000', `${closing.denominations.k1000} lembar`, formatRupiah(closing.denominations.k1000 * 1000)],
    ['Total Uang Logam (Koin)', '-', formatRupiah(closing.denominations.coins)],
    ['TOTAL UANG FISIK DI LACI', '', formatRupiah(closing.physicalCashActual)],
    ['SALDO KAS SISTEM TERCATAT', '', formatRupiah(closing.systemCashExpected)],
    ['SELISIH KAS (FISIK - SISTEM)', '', `${closing.difference >= 0 ? '+' : ''}${formatRupiah(closing.difference)} (${closing.difference === 0 ? 'COCOK' : closing.difference > 0 ? 'SELISIH LEBIH' : 'SELISIH KURANG'})`],
  ];

  autoTable(doc, {
    startY: 36,
    head: [['Rincian Pecahan Uang Fisik', 'Jumlah Lembar / Unit', 'Total Nilai (IDR)']],
    body: denomRows,
    theme: 'grid',
    headStyles: { fillColor: [30, 41, 59], textColor: 255, fontStyle: 'bold' },
    styles: { fontSize: 8.5, cellPadding: 3 },
    columnStyles: {
      0: { cellWidth: 90 },
      1: { cellWidth: 45, halign: 'center' },
      2: { cellWidth: 45, halign: 'right', fontStyle: 'bold' },
    },
  });

  const finalY = (doc as any).lastAutoTable.finalY + 15;
  if (finalY < 250) {
    doc.setFontSize(9);
    doc.text('Catatan Serah Terima:', 14, finalY);
    doc.text(closing.notes || 'Semua uang fisik telah dihitung dan diverifikasi.', 14, finalY + 6);

    doc.text('Kasir Bertugas:', 14, finalY + 20);
    doc.text(`( ${closing.cashierName} )`, 14, finalY + 38);

    doc.text('Penanggung Jawab / Owner:', 130, finalY + 20);
    doc.text('( ................................. )', 130, finalY + 38);
  }

  doc.save(`Rekap_Tutup_Kas_${closing.dateStr}_${store.storeName.replace(/\s+/g, '_')}.pdf`);
}

