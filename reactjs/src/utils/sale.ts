import { MAX_PRICE } from '../constants/sale';

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