import { useCallback } from 'react';
import { ScanResult, useComicScanner } from './useComicScanner';

export const useCoverScan = (cover: string, applyResult: (result: ScanResult) => void) => {
  const { scanCover, isScanning, scanError } = useComicScanner();

  const handleScanCover = useCallback(async () => {
    if (!cover) {
      alert('Please upload a cover image first');
      return;
    }

    const result = await scanCover(cover);
    if (result) {
      applyResult(result);
      alert(
        `✅ Cover scanned! Confidence: ${Math.round(result.confidence * 100)}%\n\nPlease review the auto-filled information.`
      );
    }
  }, [cover, scanCover, applyResult]);

  return { handleScanCover, isScanning, scanError };
};