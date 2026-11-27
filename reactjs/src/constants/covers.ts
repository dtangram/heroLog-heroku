import type { ScanField } from '../hooks/useCoverScan';

/**
 * Where covers can come from. Each source's terms ask pages that show its
 * covers to link back to it. To add a source, list it here and add its lookup
 * to COVER_SOURCES in the API (api/app/services/covers/index.ts).
 */
export const COVER_SOURCES = [
  { name: 'Comic Vine', url: 'https://comicvine.gamespot.com/', host: 'comicvine.gamespot.com' },
];

/** "Cover type: Regular cover / Variant cover", the same on every comic form */
export const COVER_TYPE_OPTIONS = [
  { value: 'Regular', id: 'regularcover', label: 'Regular cover' },
  { value: 'Variant', id: 'variantcover', label: 'Variant cover' },
];

/** What "Scan Cover with AI" fills in, on each form */
export const DEFAULT_SCAN_FIELDS: ScanField[] = ['title', 'issue', 'volume', 'year'];
export const COMIC_SCAN_FIELDS: ScanField[] = ['title', 'issue', 'volume', 'year', 'writer', 'penciler', 'inker', 'coverArtist'];
export const SALE_SCAN_FIELDS: ScanField[] = ['title', 'issue', 'volume', 'year', 'publisher'];
export const WISH_SCAN_FIELDS: ScanField[] = ['title', 'issue', 'volume', 'year', 'publisher'];

/**
 * When to check back for a cover after adding a comic without one. The API
 * looks the cover up after replying (usually 2–5 seconds, at most about 8).
 */
export const COVER_CHECKS_MS = [4000, 10000];