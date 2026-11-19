
export const SALE_CONDITIONS = [
  { value: 'Mint', label: 'Mint (9.9–10)' },
  { value: 'Near Mint', label: 'Near Mint (9.2–9.8)' },
  { value: 'Very Fine', label: 'Very Fine (7.5–9.0)' },
  { value: 'Fine', label: 'Fine (5.5–7.0)' },
  { value: 'Very Good', label: 'Very Good (3.5–5.0)' },
  { value: 'Good', label: 'Good (1.8–3.0)' },
  { value: 'Fair', label: 'Fair (1.0–1.5)' },
  { value: 'Poor', label: 'Poor (0.5)' },
] as const;

export const MAX_PRICE = 99999.99;

/** What the price box accepts while typing: up to 5 dollar digits and 2 cents digits */
export const PRICE_INPUT = /^\d{0,5}(\.\d{0,2})?$/;

const dollars = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

export const formatPrice = (value: string | number | null | undefined): string | null => {
  if (value === null || value === undefined || String(value).trim() === '') return null;
  const amount = Number(value);
  return Number.isFinite(amount) && amount > 0 ? dollars.format(amount) : null;
};

/** Checks a price typed into the sale form. Returns an error message, or null if it's fine. */
export const validatePrice = (value: string): string | null => {
  const text = value.trim();
  if (!text) return 'Price is required';
  if (!/^\d+(\.\d{1,2})?$/.test(text)) return 'Price must be a dollar amount, like 12.50';
  const amount = Number(text);
  if (amount < 0.01) return 'Price must be at least $0.01';
  if (amount > MAX_PRICE) return 'Price must be $99,999.99 or less';
  return null;
};