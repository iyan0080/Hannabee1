// Web Contacts Picker API Integration for Mobile Browsers
import { cleanPhoneNumber } from './format';

export interface PickedContactResult {
  success: boolean;
  name?: string;
  phone?: string;
  rawPhone?: string;
  message?: string;
}

export function isContactPickerSupported(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
  return 'contacts' in navigator && 'ContactsManager' in window;
}

/**
 * Open native mobile contacts picker to select a phone number directly from phone contact book
 */
export async function pickContactFromPhone(): Promise<PickedContactResult> {
  try {
    if (!isContactPickerSupported()) {
      return {
        success: false,
        message: 'Fitur ambil kontak langsung hanya didukung di browser HP Android (seperti Chrome/Edge Mobile). Pada perangkat desktop, silakan ketik atau pilih dari daftar pelanggan.',
      };
    }

    const nav = navigator as any;
    const properties = ['name', 'tel'];
    const options = { multiple: false };

    const contacts = await nav.contacts.select(properties, options);

    if (!contacts || contacts.length === 0) {
      return {
        success: false,
        message: 'Pemilihan kontak dibatalkan.',
      };
    }

    const selected = contacts[0];
    const rawName = Array.isArray(selected.name) ? selected.name[0] : selected.name || '';
    const rawTels = Array.isArray(selected.tel) ? selected.tel : [selected.tel];
    const chosenTel = rawTels && rawTels.length > 0 ? String(rawTels[0]) : '';

    if (!chosenTel) {
      return {
        success: false,
        name: rawName,
        message: 'Kontak yang dipilih tidak memiliki nomor telepon.',
      };
    }

    // Format standard Indonesian phone number for display & WA
    let formattedPhone = chosenTel.replace(/[^\d+]/g, '');
    if (formattedPhone.startsWith('+62')) {
      formattedPhone = '0' + formattedPhone.slice(3);
    } else if (formattedPhone.startsWith('62') && formattedPhone.length > 9) {
      formattedPhone = '0' + formattedPhone.slice(2);
    }

    return {
      success: true,
      name: rawName,
      phone: formattedPhone,
      rawPhone: chosenTel,
    };
  } catch (err: any) {
    if (err.name === 'AbortError' || err.name === 'SecurityError') {
      return {
        success: false,
        message: 'Pemilihan kontak dibatalkan atau izin kontak ditolak.',
      };
    }
    return {
      success: false,
      message: err.message || 'Gagal mengakses kontak perangkat.',
    };
  }
}
