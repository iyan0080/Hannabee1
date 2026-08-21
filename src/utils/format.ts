import { Transaction, Customer, StoreSettings, CartItem } from '../types';

export function formatRupiah(amount: number): string {
  if (isNaN(amount) || amount === null || amount === undefined) return 'Rp 0';
  return 'Rp ' + Math.round(amount).toLocaleString('id-ID');
}

export function formatDate(isoString: string): string {
  if (!isoString) return '-';
  try {
    const d = new Date(isoString);
    return d.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return isoString;
  }
}

export const formatDateWithTime = formatDate;

export function formatDateOnly(isoString: string): string {
  if (!isoString) return '-';
  try {
    const d = new Date(isoString);
    return d.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return isoString;
  }
}

export function cleanPhoneNumber(phone: string): string {
  let cleaned = (phone || '').replace(/[^0-9]/g, '');
  if (cleaned.startsWith('0')) {
    cleaned = '62' + cleaned.slice(1);
  } else if (cleaned.startsWith('8')) {
    cleaned = '62' + cleaned;
  } else if (!cleaned.startsWith('62') && cleaned.length > 5) {
    cleaned = '62' + cleaned;
  }
  return cleaned;
}

export function generateReceiptWhatsAppText(transaction: Transaction, store: StoreSettings): string {
  const dateStr = formatDate(transaction.timestamp);
  
  let itemsText = '';
  transaction.items.forEach((item, index) => {
    const variantsText = item.selectedVariants.length > 0
      ? ` (${item.selectedVariants.map(v => v.name).join(', ')})`
      : '';
    const discountText = item.discountAmount && item.discountAmount > 0
      ? ` (Diskon: -${formatRupiah(item.discountAmount)})`
      : '';
    itemsText += `${index + 1}. *${item.productName}${variantsText}*\n`;
    itemsText += `   ${item.quantity}x @ ${formatRupiah(item.finalPricePerUnit)}${discountText} = *${formatRupiah(item.subtotal)}*\n`;
    if (item.notes) {
      itemsText += `   _Catatan: ${item.notes}_\n`;
    }
  });

  const paymentStatus = transaction.status === 'BATAL'
    ? '❌ *DIBATALKAN*'
    : transaction.status === 'DIRETUR_SEBAGIAN'
    ? '🔄 *DIRETUR SEBAGIAN*'
    : transaction.status === 'LUNAS' 
    ? '✅ *LUNAS*' 
    : '⏳ *BELUM LUNAS (KASBON)*';

  const methodLabel = transaction.paymentMethod === 'SALDO_DEPOSIT'
    ? '💳 SALDO DEPOSIT'
    : transaction.paymentMethod;

  let cancelInfoText = '';
  if (transaction.status === 'BATAL') {
    cancelInfoText = `\n⚠️ *STATUS: PESANAN DIBATALKAN*\nAlasan Batal: _${transaction.cancellationReason || 'Tidak ada keterangan'}_\n`;
  }

  let returnInfoText = '';
  if (transaction.status === 'DIRETUR_SEBAGIAN' && transaction.returnRecords && transaction.returnRecords.length > 0) {
    returnInfoText = `\n🔄 *INFORMASI RETUR ITEM:*\n`;
    transaction.returnRecords.forEach((rec, idx) => {
      returnInfoText += `• Retur #${idx + 1}: *${formatRupiah(rec.totalRefundAmount)}* (${rec.refundMethod})\n  Alasan: _${rec.reason}_\n`;
    });
    const netAmount = Math.max(0, transaction.finalAmount - (transaction.totalReturnedAmount || 0));
    returnInfoText += `*Net Tagihan Aktif: ${formatRupiah(netAmount)}*\n`;
  }

  let depositInfoText = '';
  if (transaction.paymentMethod === 'SALDO_DEPOSIT' && transaction.remainingDeposit !== undefined) {
    depositInfoText = `Sisa Saldo: *${formatRupiah(transaction.remainingDeposit)}*\n`;
  }

  let discountLabel = 'Diskon   ';
  if (transaction.discount > 0) {
    if (transaction.discountType === 'PERCENTAGE' && transaction.discountRate) {
      discountLabel = `Diskon (${transaction.discountRate}%)`;
    } else if (transaction.customerType === 'RESELLER') {
      discountLabel = `Diskon Reseller`;
    }
  }

  const customerGroupTag = transaction.customerType === 'RESELLER' ? ' [Reseller]' : '';

  const text = `🧾 *NOTA DIGITAL - ${store.storeName.toUpperCase()}*
${store.tagline ? `_${store.tagline}_\n` : ''}📍 ${store.address}
📞 Pemesanan: ${store.phone}
----------------------------------------
No. Nota : *${transaction.invoiceNumber}*
Waktu    : ${dateStr}
Kasir    : ${transaction.cashierName}
Pelanggan: ${transaction.customerName || 'Umum'}${customerGroupTag}
Status   : ${paymentStatus}${cancelInfoText}${returnInfoText}
----------------------------------------
*RINCIAN PESANAN:*
${itemsText}----------------------------------------
Subtotal : ${formatRupiah(transaction.subtotal)}
${transaction.discount > 0 ? `${discountLabel.padEnd(9, ' ')}: -${formatRupiah(transaction.discount)}\n` : ''}${transaction.tax > 0 ? `Pajak    : +${formatRupiah(transaction.tax)}\n` : ''}*TOTAL    : ${formatRupiah(transaction.finalAmount)}*
Metode   : ${methodLabel}
${depositInfoText}${transaction.paymentMethod === 'TUNAI' ? `Bayar    : ${formatRupiah(transaction.amountPaid)}\nKembali  : ${formatRupiah(transaction.change)}\n` : ''}----------------------------------------
${store.receiptFooter || 'Terima kasih telah berbelanja di HannaBee!'}
_Simpan nota digital ini sebagai bukti transaksi resmi._`;

  return text;
}

export function generateTopUpReceiptWhatsAppText(
  customer: Customer,
  amount: number,
  newBalance: number,
  method: string,
  store: StoreSettings
): string {
  const dateStr = formatDate(new Date().toISOString());
  return `💰 *BUKTI DEPOSIT SALDO - ${store.storeName.toUpperCase()}*
${store.tagline ? `_${store.tagline}_\n` : ''}📞 Pemesanan: ${store.phone}
----------------------------------------
Tanggal  : ${dateStr}
Pelanggan: *${customer.name}* (${customer.phone})
----------------------------------------
Nominal Top Up : *+${formatRupiah(amount)}*
Metode Bayar   : ${method}
*TOTAL SALDO SEKARANG : ${formatRupiah(newBalance)}*
----------------------------------------
_Saldo deposit ini dapat digunakan sewaktu-waktu untuk pembayaran pesanan makanan & minuman di ${store.storeName}._

Terima kasih atas kepercayaannya! 🙏😊`;
}

export function generateBillWhatsAppText(
  customer: Customer, 
  unpaidTransactions: Transaction[], 
  store: StoreSettings
): string {
  let billsList = '';
  let totalDue = 0;

  unpaidTransactions.forEach((trx, i) => {
    totalDue += trx.finalAmount;
    billsList += `${i + 1}. Nota *${trx.invoiceNumber}* (${formatDateOnly(trx.timestamp)})\n   Nominal: *${formatRupiah(trx.finalAmount)}*\n`;
  });

  const text = `🙏 *PENGINGAT NOTA TAGIHAN / KASBON*
*${store.storeName}*
----------------------------------------
Kepada Yth. *${customer.name}*
Semoga selalu dalam keadaan sehat dan berkah.

Berikut kami sampaikan rincian tagihan kasbon/bon belanja Anda di *${store.storeName}*:

${billsList || `Total Kasbon Tercatat: *${formatRupiah(customer.totalDebt)}*\n`}
----------------------------------------
*TOTAL YANG HARUS DIBAYAR: ${formatRupiah(customer.totalDebt || totalDue)}*
----------------------------------------
💳 Pembayaran dapat dilakukan via:
- Tunai langsung di warung
${store.bankInfo ? `- Transfer Bank: ${store.bankInfo}\n` : ''}${store.qrisInfo ? `- QRIS: ${store.qrisInfo}\n` : ''}
Jika sudah melakukan pembayaran, mohon konfirmasi via pesan WhatsApp ini ya. 
Terima kasih banyak atas kerjasamanya! 🙏😊`;

  return text;
}

export function generatePromoWhatsAppText(
  customerName: string, 
  promoContent: string, 
  store: StoreSettings
): string {
  return `Halo Kak *${customerName || 'Pelanggan Setia'}*! 👋✨
Ada info spesial dari *${store.storeName}*:

${promoContent}

📍 ${store.address}
📞 Pesan/Tanya: ${store.phone}

_Terima kasih telah menjadi pelanggan setia ${store.storeName}!_`;
}

export function openWhatsApp(phone: string, message: string) {
  const cleaned = cleanPhoneNumber(phone);
  const encoded = encodeURIComponent(message);
  const url = cleaned 
    ? `https://wa.me/${cleaned}?text=${encoded}`
    : `https://api.whatsapp.com/send?text=${encoded}`;
  
  window.open(url, '_blank');
}

export function getTodayStart(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export function getTodayEnd(): Date {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d;
}

export function getLast7DaysStart(): Date {
  const d = new Date();
  d.setDate(d.getDate() - 6);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function getMonthStart(): Date {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function getMonthEnd(): Date {
  const d = new Date();
  d.setMonth(d.getMonth() + 1, 0);
  d.setHours(23, 59, 59, 999);
  return d;
}

export function getLastMonthStart(): Date {
  const d = new Date();
  d.setMonth(d.getMonth() - 1, 1);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function getLastMonthEnd(): Date {
  const d = new Date();
  d.setDate(0);
  d.setHours(23, 59, 59, 999);
  return d;
}
