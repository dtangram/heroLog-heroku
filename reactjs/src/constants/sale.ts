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

/** Sale listings shown on the landing page */
export const SALE_PREVIEW_SIZE = 8;