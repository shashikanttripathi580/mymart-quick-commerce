import { OrderAddressSnapshot } from './types.js';
/**
 * Converts integer paise into formatted INR currency string.
 * e.g., 24900 -> "₹249", 24950 -> "₹249.50"
 */
export declare function formatPaiseToRupees(paise: number | undefined | null): string;
/**
 * Converts integer paise into a standard float number in Rupees for input controls.
 */
export declare function paiseToRupeesNumber(paise: number | undefined | null): number;
/**
 * Converts float Rupees into integer paise safely avoiding floating point rounding errors.
 */
export declare function rupeesToPaise(rupees: number | string | undefined | null): number;
/**
 * Calculates discount percentage between MRP and Selling Price.
 */
export declare function calculateDiscountPercentage(mrpPaise: number, sellingPricePaise: number): number;
/**
 * Validates 10-digit Indian mobile number format (allowing optional +91 or 0 prefix).
 */
export declare function isValidIndianMobile(phone: string): boolean;
/**
 * Normalizes an Indian mobile phone number to 10 digits.
 */
export declare function normalizeIndianMobile(phone: string): string;
/**
 * Validates 6-digit Indian Postal PIN code.
 */
export declare function isValidIndianPincode(pincode: string): boolean;
/**
 * Standard email validation.
 */
export declare function isValidEmail(email: string): boolean;
/**
 * Formats full Indian postal address string for display.
 */
export declare function formatIndianAddress(address: OrderAddressSnapshot): string;
/**
 * Converts any title to a URL-friendly slug.
 */
export declare function slugify(text: string): string;
/**
 * Creates human-readable order number prefix: MYM-YYYYMMDD-XXXX
 */
export declare function generateOrderNumber(): string;
//# sourceMappingURL=utils.d.ts.map