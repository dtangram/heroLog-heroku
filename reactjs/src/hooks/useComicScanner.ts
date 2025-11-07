import { useState, useCallback } from 'react';
import API from '../API';

interface ScanResult {
  comicBookTitle?: string;
  title?: string;
  comicIssue: string;
  comicBookVolume: string;
  volume?: string;
  comicBookYear: string;
  year?: string;
  comicBookPublisher: string;
  type: 'regular' | 'variant';
  confidence: number;
}

interface ScanResponse {
  success: boolean;
  data?: ScanResult;
  error?: string;
}

export const useComicScanner = () => {
  const [isScanning, setIsScanning] = useState(false);
  const [scanError, setScanError] = useState<string>('');

  const scanCover = useCallback(async (imageUrl: string): Promise<ScanResult | null> => {
    if (!imageUrl) {
      setScanError('Please upload a cover image first');
      return null;
    }

    setIsScanning(true);
    setScanError('');

    try {
      console.log('🔍 Scanning cover:', imageUrl);

      const response = await API.post<ScanResponse>('/ai/scan-comic-cover', {
        imageUrl
      });

      if (response.data.success && response.data.data) {
        console.log('✅ Scan successful:', response.data.data);
        return response.data.data;
      } else {
        const errorMsg = response.data.error || 'Failed to scan cover';
        console.error('❌ Scan failed:', errorMsg);
        setScanError(errorMsg);
        return null;
      }
    } catch (error) {
      console.error('❌ Scan error:', error);
      const errorMsg = error instanceof Error 
        ? error.message 
        : 'Failed to scan cover. Please try again.';
      setScanError(errorMsg);
      return null;
    } finally {
      setIsScanning(false);
    }
  }, []);

  const clearError = useCallback(() => {
    setScanError('');
  }, []);

  return {
    scanCover,
    isScanning,
    scanError,
    clearError
  };
};