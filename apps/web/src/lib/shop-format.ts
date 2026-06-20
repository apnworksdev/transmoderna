export function formatEurPrice(amount: number): string {
  return `${amount.toFixed(2).replace('.', ',')}€`;
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
