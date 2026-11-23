import React, { ChangeEvent } from 'react';
import ScanCoverButton from '../scanCoverButton/ScanCoverButton';
import styles from './styles.module.css';

interface CoverPickerProps {
  /** The field's label, e.g. "Comic Book Cover" */
  label: string;
  hasCover: boolean;
  isUploading: boolean;
  disabled?: boolean;
  onFileChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onScan: () => void;
  isScanning: boolean;
  scanError?: string;
}

/**
 * Choosing a cover image, then scanning it with AI. Replaces the browser's
 * plain "Choose File" control with a button that matches the rest of the form;
 * the file input itself stays in the page (visually hidden) so it still works
 * with the keyboard and screen readers.
 */
const CoverPicker: React.FC<CoverPickerProps> = ({
  label,
  hasCover,
  isUploading,
  disabled = false,
  onFileChange,
  onScan,
  isScanning,
  scanError,
}) => (
  <>
    <label htmlFor="comicBookCover" className={styles.picker}>
      {label}
      <input
        id="comicBookCover"
        className={styles.input}
        type="file"
        name="comicBookCover"
        accept="image/jpeg,image/jpg,image/png"
        onChange={onFileChange}
        disabled={disabled || isUploading}
      />
      <span className={styles.button} aria-hidden="true">
        {isUploading ? 'Uploading…' : hasCover ? 'Change cover' : 'Choose cover'}
      </span>
      <span className={styles.hint}>JPG or PNG, up to 1MB</span>
    </label>

    {hasCover && (
      <ScanCoverButton
        onScan={onScan}
        isScanning={isScanning}
        disabled={disabled || isUploading}
        error={scanError}
      />
    )}
  </>
);

export default CoverPicker;