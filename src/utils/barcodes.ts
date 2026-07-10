import JsBarcode from 'jsbarcode';
import QRCode from 'qrcode';

/**
 * Generates a PNG Base64 Data URL for a given barcode string.
 * Uses Code 128 format by default.
 */
export function generateBarcodeDataURL(text: string): string {
  try {
    const canvas = document.createElement('canvas');
    JsBarcode(canvas, text, {
      format: 'CODE128',
      lineColor: '#000000',
      width: 2,
      height: 60,
      displayValue: true,
      fontSize: 14,
      font: 'monospace',
      margin: 10,
    });
    return canvas.toDataURL('image/png');
  } catch (err) {
    console.error('Failed to generate Barcode:', err);
    return '';
  }
}

/**
 * Generates a PNG Base64 Data URL for a given QR Code string.
 */
export async function generateQRDataURL(text: string): Promise<string> {
  try {
    const dataURL = await QRCode.toDataURL(text, {
      width: 300,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
    });
    return dataURL;
  } catch (err) {
    console.error('Failed to generate QR Code:', err);
    return '';
  }
}

/**
 * Generates a highly unique random SKU with format SKY-YYYYMMDD-XXXX (4 random alphanumeric characters)
 */
export function generateUniqueSKU(categoryPrefix = 'PROD'): string {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const randChars = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${categoryPrefix.substring(0, 4).toUpperCase()}-${dateStr}-${randChars}`;
}

/**
 * Generates a highly unique numeric Barcode string (e.g. 12 digits, EAN-13 style or simple 12 digit UPC/numeric format)
 */
export function generateUniqueBarcode(): string {
  const timestamp = Date.now().toString().slice(-10);
  const randomDigits = Math.floor(10 + Math.random() * 90).toString(); // 2 random digits
  return `${timestamp}${randomDigits}`;
}
