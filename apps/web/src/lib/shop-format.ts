const LOCALE = 'en-IE';

export function formatPrice(amount: number, currencyCode = 'EUR'): string {
  try {
    return new Intl.NumberFormat(LOCALE, {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currencyCode}`;
  }
}

/** @deprecated Prefer formatPrice with currencyCode from Shopify */
export function formatEurPrice(amount: number): string {
  return formatPrice(amount, 'EUR');
}

export function parsePriceAmount(value: string | number | undefined | null): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}
