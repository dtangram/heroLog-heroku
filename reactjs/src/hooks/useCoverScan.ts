import { useCallback } from 'react';
import { ScanResult, useComicScanner } from './useComicScanner';
import { notify, showAlert } from '../components/dialog';

/**
 * "Scan Cover with AI": reads the uploaded cover and hands the result to
 * applyResult, which copies it into the form's own field names. scanNewCover
 * scans a cover the moment it's uploaded, without waiting for the button.
 */
export const useCoverScan = (cover: string, applyResult: (result: ScanResult) => void) => {
  const { scanCover, isScanning, scanError } = useComicScanner();

  /** Scan a cover by its URL, e.g. one that has just finished uploading */
  const scanNewCover = useCallback(async (url: string) => {
    const result = await scanCover(url);
    if (result) {
      applyResult(result);
      notify(
        `Cover scanned (${Math.round(result.confidence * 100)}% confidence). Please review the filled-in fields.`
      );
    }
  }, [scanCover, applyResult]);

  const handleScanCover = useCallback(async () => {
    if (!cover) {
      showAlert('Choose a cover image first, then scan it to fill in the form.', { title: 'No cover to scan yet' });
      return;
    }
    await scanNewCover(cover);
  }, [cover, scanNewCover]);

  return { handleScanCover, scanNewCover, isScanning, scanError };
};