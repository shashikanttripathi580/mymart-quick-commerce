import { OrderAddressSnapshot } from './types.js';
import { CURRENCY_SYMBOL } from './constants.js';

/**
 * Converts integer paise into formatted INR currency string.
 * e.g., 24900 -> "₹249", 24950 -> "₹249.50"
 */
export function formatPaiseToRupees(paise: number | undefined | null): string {
  if (paise == null || isNaN(paise)) return `${CURRENCY_SYMBOL}0`;
  const rupees = paise / 100;
  // If no fractional paise, show integer; otherwise show 2 decimals
  const formatted = rupees % 1 === 0 ? rupees.toFixed(0) : rupees.toFixed(2);
  return `${CURRENCY_SYMBOL}${formatted}`;
}

/**
 * Converts integer paise into a standard float number in Rupees for input controls.
 */
export function paiseToRupeesNumber(paise: number | undefined | null): number {
  if (paise == null || isNaN(paise)) return 0;
  return Math.round(paise) / 100;
}

/**
 * Converts float Rupees into integer paise safely avoiding floating point rounding errors.
 */
export function rupeesToPaise(rupees: number | string | undefined | null): number {
  if (rupees == null) return 0;
  const num = typeof rupees === 'string' ? parseFloat(rupees) : rupees;
  if (isNaN(num)) return 0;
  return Math.round(num * 100);
}

/**
 * Calculates discount percentage between MRP and Selling Price.
 */
export function calculateDiscountPercentage(
  mrpPaise: number,
  sellingPricePaise: number
): number {
  if (!mrpPaise || mrpPaise <= sellingPricePaise) return 0;
  const discount = ((mrpPaise - sellingPricePaise) / mrpPaise) * 100;
  return Math.round(discount);
}

/**
 * Validates 10-digit Indian mobile number format (allowing optional +91 or 0 prefix).
 */
export function isValidIndianMobile(phone: string): boolean {
  if (!phone) return false;
  // Strip spaces, dashes, parentheses
  const cleaned = phone.replace(/[\s\-()]/g, '');
  // Matches 10 digits starting with 6,7,8,9, or prefixed with +91 or 91 or 0
  const indianPhoneRegex = /^(?:\+91|91|0)?[6-9]\d{9}$/;
  return indianPhoneRegex.test(cleaned);
}

/**
 * Normalizes an Indian mobile phone number to 10 digits.
 */
export function normalizeIndianMobile(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 12 && cleaned.startsWith('91')) {
    return cleaned.slice(2);
  }
  if (cleaned.length === 11 && cleaned.startsWith('0')) {
    return cleaned.slice(1);
  }
  return cleaned;
}

/**
 * Validates 6-digit Indian Postal PIN code.
 */
export function isValidIndianPincode(pincode: string): boolean {
  if (!pincode) return false;
  const cleaned = pincode.trim();
  // 6 digits, first digit between 1 and 9
  return /^[1-9][0-9]{5}$/.test(cleaned);
}

/**
 * Standard email validation.
 */
export function isValidEmail(email: string): boolean {
  if (!email) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

/**
 * Formats full Indian postal address string for display.
 */
export function formatIndianAddress(address: OrderAddressSnapshot): string {
  const parts = [
    address.house_number,
    address.street,
    address.area,
    address.landmark ? `Near ${address.landmark}` : null,
    address.city,
    `${address.state} - ${address.pincode}`,
  ].filter(Boolean);

  return parts.join(', ');
}

/**
 * Converts any title to a URL-friendly slug.
 */
export function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-') // Replace spaces with -
    .replace(/[^\w-]+/g, '') // Remove all non-word chars
    .replace(/--+/g, '-') // Replace multiple - with single -
    .replace(/^-+/, '') // Trim - from start
    .replace(/-+$/, ''); // Trim - from end
}

/**
 * Creates human-readable order number prefix: MYM-YYYYMMDD-XXXX
 */
export function generateOrderNumber(): string {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  return `MYM-${year}${month}${day}-${randomSuffix}`;
}
