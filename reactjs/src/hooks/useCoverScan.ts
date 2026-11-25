import { useCallback } from 'react';
import { ScanResult, useComicScanner } from './useComicScanner';
import { notify, showAlert } from '../components/dialog';

/** Fields a scan can fill in, named the way the forms label them */
export type ScanField = 'title' | 'issue' | 'volume' | 'year' | 'publisher' | 'writer' | 'penciler' | 'inker' | 'coverArtist';

const SCAN_FIELDS: Record<ScanField, { label: string; read: (result: ScanResult) => unknown }> = {
  title: { label: 'title', read: r => r.title || r.comicBookTitle },
  issue: { label: 'issue number', read: r => r.comicIssue },
  volume: { label: 'volume', read: r => r.volume || r.comicBookVolume },
  year: { label: 'year', read: r => r.year || r.comicBookYear },
  publisher: { label: 'publisher', read: r => r.comicBookPublisher },
  writer: { label: 'writer', read: r => r.author },
  penciler: { label: 'penciler', read: r => r.penciler },
  inker: { label: 'inker', read: r => r.inker },
  coverArtist: { label: 'cover artist', read: r => r.coverartist },
};

/** "writer", "writer or penciler", "writer, penciler or inker" */
const joinOr = (items: string[]) =>
  items.length <= 1 ? items.join('') : `${items.slice(0, -1).join(', ')} or ${items[items.length - 1]}`;

/** The labels of the fields this scan left blank */
export const unreadFields = (result: ScanResult, fields: ScanField[]): string[] =>
  fields.filter(field => !String(SCAN_FIELDS[field].read(result) ?? '').trim()).map(field => SCAN_FIELDS[field].label);

/** What to tell the user after a scan, naming anything it couldn't read */
export const scanMessage = (result: ScanResult, fields: ScanField[]): string => {
  const confidence = `Cover scanned (${Math.round(result.confidence * 100)}% confidence).`;
  const missing = unreadFields(result, fields);
  return missing.length === 0
    ? `${confidence} Please check the filled-in fields.`
    : `${confidence} It couldn't read the ${joinOr(missing)}, so please fill ${missing.length === 1 ? 'that' : 'those'} in and check the rest.`;
};

const DEFAULT_FIELDS: ScanField[] = ['title', 'issue', 'volume', 'year'];

/**
 * "Scan Cover with AI": reads the uploaded cover and hands the result to
 * applyResult, which copies it into the form's own field names. scanNewCover
 * scans a cover the moment it's uploaded, without waiting for the button.
 * fields: the form's fields a scan can fill, so the message can name any it
 * couldn't read.
 */
export const useCoverScan = (
  cover: string,
  applyResult: (result: ScanResult) => void,
  fields: ScanField[] = DEFAULT_FIELDS
) => {
  const { scanCover, isScanning, scanError } = useComicScanner();

  /** Scan a cover by its URL, e.g. one that has just finished uploading */
  const scanNewCover = useCallback(async (url: string) => {
    const result = await scanCover(url);
    if (result) {
      applyResult(result);
      notify(scanMessage(result, fields), unreadFields(result, fields).length ? 'info' : 'success');
    }
  }, [scanCover, applyResult, fields]);

  const handleScanCover = useCallback(async () => {
    if (!cover) {
      showAlert('Choose a cover image first, then scan it to fill in the form.', { title: 'No cover to scan yet' });
      return;
    }
    await scanNewCover(cover);
  }, [cover, scanNewCover]);

  return { handleScanCover, scanNewCover, isScanning, scanError };
};