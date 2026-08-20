/**
 * Utility for image compression and validation for Menu Photos (Max 1MB)
 */

export const MAX_IMAGE_SIZE_BYTES = 1024 * 1024; // 1MB

export interface ProcessImageResult {
  success: boolean;
  dataUrl?: string;
  sizeBytes?: number;
  sizeFormatted?: string;
  errorMessage?: string;
}

export function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * Reads a File object and compresses it if necessary so it never exceeds 1MB.
 */
export async function processMenuImage(file: File): Promise<ProcessImageResult> {
  // Validate file type
  if (!file.type.startsWith('image/')) {
    return {
      success: false,
      errorMessage: 'File yang dipilih bukan merupakan format gambar yang valid.',
    };
  }

  return new Promise((resolve) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        // If image is already smaller than 1MB and dimension is reasonable, test size
        const originalDataUrl = event.target?.result as string;

        // Calculate maximum dimensions
        const maxDimension = 1200;
        let width = img.width;
        let height = img.height;

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          // Fallback if canvas context fails
          const approximateBytes = Math.round((originalDataUrl.length * 3) / 4);
          if (approximateBytes > MAX_IMAGE_SIZE_BYTES) {
            resolve({
              success: false,
              errorMessage: `Ukuran foto (${formatBytes(approximateBytes)}) melebihi batas maksimal 1MB.`,
            });
          } else {
            resolve({
              success: true,
              dataUrl: originalDataUrl,
              sizeBytes: approximateBytes,
              sizeFormatted: formatBytes(approximateBytes),
            });
          }
          return;
        }

        // Fill white background for transparent PNGs
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        // Try compressing with decreasing quality until size <= 1MB
        let quality = 0.85;
        let compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
        let approximateBytes = Math.round((compressedDataUrl.length * 3) / 4);

        while (approximateBytes > MAX_IMAGE_SIZE_BYTES && quality > 0.3) {
          quality -= 0.15;
          compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
          approximateBytes = Math.round((compressedDataUrl.length * 3) / 4);
        }

        if (approximateBytes > MAX_IMAGE_SIZE_BYTES) {
          resolve({
            success: false,
            errorMessage: `Ukuran foto (${formatBytes(approximateBytes)}) melebihi batas maksimal 1MB. Silakan pilih foto dengan resolusi lebih kecil.`,
          });
        } else {
          resolve({
            success: true,
            dataUrl: compressedDataUrl,
            sizeBytes: approximateBytes,
            sizeFormatted: formatBytes(approximateBytes),
          });
        }
      };

      img.onerror = () => {
        resolve({
          success: false,
          errorMessage: 'Gagal memuat dan memproses file gambar.',
        });
      };

      img.src = event.target?.result as string;
    };

    reader.onerror = () => {
      resolve({
        success: false,
        errorMessage: 'Gagal membaca file foto yang diunggah.',
      });
    };

    reader.readAsDataURL(file);
  });
}
