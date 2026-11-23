import React from 'react';
import { BeatLoader } from 'react-spinners';
import styles from './styles.module.css';

interface ScanCoverButtonProps {
  onScan: () => void;
  isScanning: boolean;
  disabled?: boolean;
  error?: string;
}

const ScanCoverButton: React.FC<ScanCoverButtonProps> = ({
  onScan,
  isScanning,
  disabled = false,
  error
}) => {
  return (
    <section className={styles.scanContainer} aria-label="Scan the cover">
      <button
        type="button"
        onClick={onScan}
        disabled={disabled || isScanning}
        className={styles.scanButton}
      >
        {isScanning ? (
          <>
            <BeatLoader size={8} color="#fff" />
            <span>Scanning...</span>
          </>
        ) : (
          <>
            <span>Scan Cover with AI</span>
          </>
        )}
      </button>
      
      {error && (
        <p className={styles.scanError}>{error}</p>
      )}
      
      {isScanning && (
        <p className={styles.scanInfo} role="status">
          AI is analyzing your cover image...
        </p>
      )}
    </section>
  );
};

export default ScanCoverButton;