import { useCallback } from 'react';
import { ScanResult, useComicScanner } from './useComicScanner';
import { notify, showAlert } from '../components/dialog';

/**
 * "Scan Cover with AI": reads the uploaded cover and hands the result to
 * applyResult, which copies it into the form's own field names.
 */
export const useCoverScan = (cover: string, applyResult: (result: ScanResult) => void) => {
  const { scanCover, isScanning, scanError } = useComicScanner();

  const handleScanCover = useCallback(async () => {
    if (!cover) {
      showAlert('Choose a cover image first, then scan it to fill in the form.', { title: 'No cover to scan yet' });
      return;
    }

    const result = await scanCover(cover);
    if (result) {
      applyResult(result);
      notify(
        `Cover scanned (${Math.round(result.confidence * 100)}% confidence). Please review the filled-in fields.`
      );
    }
  }, [cover, scanCover, applyResult]);

  return { handleScanCover, isScanning, scanError };
};