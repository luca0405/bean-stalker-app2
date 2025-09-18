/**
 * Square Price Conversion Utilities
 * Fixes floating-point arithmetic issues by using integer cents directly from Square Money.amount
 */

/**
 * Get cents directly from Square Money object (always integer)
 * This prevents floating-point precision errors that cause database failures
 */
export function getCentsFromSquareMoney(money: { amount: number; currency: string } | null | undefined): number {
  // Square Money.amount is always in cents (integer)
  return money?.amount || 0;
}

/**
 * Convert cents to dollars for display (only for UI, never for calculations)
 */
export function centsToDisplayPrice(cents: number): number {
  return cents / 100;
}

/**
 * Convert display price to cents (only when creating Square Money objects)
 */
export function displayPriceToCents(dollars: number): number {
  return Math.round(dollars * 100);
}

/**
 * Calculate price delta using integer math only
 * This prevents "invalid input syntax for type integer" errors
 */
export function calculatePriceDeltaCents(variationCents: number, baseCents: number): number {
  return variationCents - baseCents; // Integer subtraction only
}

/**
 * Validate that a price value is a valid integer (in cents)
 */
export function validatePriceCents(cents: any): number {
  const parsed = parseInt(cents, 10);
  if (isNaN(parsed)) {
    console.warn(`⚠️ Invalid price cents value: ${cents}, defaulting to 0`);
    return 0;
  }
  return parsed;
}

/**
 * Create Square Money object from cents
 */
export function createSquareMoneyFromCents(cents: number, currency: string = 'AUD'): { amount: number; currency: string } {
  return {
    amount: validatePriceCents(cents),
    currency
  };
}

/**
 * Safe price conversion from any source to valid cents
 */
export function safeConvertToCents(price: any): number {
  if (typeof price === 'number') {
    // If it's already a number, check if it's in cents or dollars
    if (price < 100 && price > 0) {
      // Likely dollars, convert to cents
      return displayPriceToCents(price);
    }
    // Likely already in cents
    return validatePriceCents(price);
  }
  
  if (typeof price === 'string') {
    const parsed = parseFloat(price);
    if (parsed < 100 && parsed > 0) {
      // Likely dollars
      return displayPriceToCents(parsed);
    }
    return validatePriceCents(parsed);
  }
  
  return 0;
}