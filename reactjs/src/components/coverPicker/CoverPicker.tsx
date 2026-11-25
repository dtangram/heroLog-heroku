import React, { ChangeEvent } from 'react';
import ScanCoverButton from '../scanCoverButton/ScanCoverButton';
import styles from './styles.module.css';

interface CoverPickerProps {
  /** The field's label, e.g. "Cover" */
  label: string;
  hasCover: boolean;
  isUploading: boolean;
  disabled?: boolean;
  onFileChange: (event: ChangeEvent<HTMLInputElement>) => void;
  /** Leave out for images that aren't comic covers, e.g. a profile photo: no scan button */
  onScan?: () => void;
  isScanning?: boolean;
  scanError?: string;
  /** The file input's id and name; "comicBookCover" unless set */
  id?: string;
  /** The button's words before and after an image is chosen */
  chooseText?: string;
  changeText?: string;
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
  isScanning = false,
  scanError,
  id = 'comicBookCover',
  chooseText = 'Choose cover',
  changeText = 'Change cover',
}) => (
  <>
    <label htmlFor={id} className={styles.picker}>
      {label}
      <input
        id={id}
        className={styles.input}
        type="file"
        name={id}
        accept="image/jpeg,image/jpg,image/png"
        onChange={onFileChange}
        disabled={disabled || isUploading}
      />
      <span className={styles.button} aria-hidden="true">
        {isUploading ? 'Uploading…' : hasCover ? changeText : chooseText}
      </span>
      <span className={styles.hint}>JPG or PNG, up to 1MB</span>
    </label>

    {hasCover && onScan && (
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