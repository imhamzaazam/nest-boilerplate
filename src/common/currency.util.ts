export const DEFAULT_CURRENCY = 'PKR';

export function formatCurrencyMinor(
  amountMinor: number,
  currency: string = DEFAULT_CURRENCY,
): string {
  const value = (amountMinor / 100).toFixed(2);
  if (currency === 'PKR') return `Rs ${value}`;
  try {
    return new Intl.NumberFormat('en', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amountMinor / 100);
  } catch {
    return `${currency} ${value}`;
  }
}

export function formatCurrencyMajor(
  amountMajor: number,
  currency: string = DEFAULT_CURRENCY,
): string {
  return formatCurrencyMinor(Math.round(amountMajor * 100), currency);
}
