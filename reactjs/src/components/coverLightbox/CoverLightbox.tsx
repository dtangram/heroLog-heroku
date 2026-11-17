import React, { MouseEvent, ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import styles from './styles.module.css';

interface CoverLightboxProps {
  /** Full-size cover image */
  src: string;
  /** Alt text for the enlarged image */
  alt: string;
  /** Shown under the image and used as the dialog's name, e.g. "Batman #423" */
  caption: string;
  /** The thumbnail that opens the lightbox */
  children: ReactNode;
}

/**
 * Click a cover to see it larger without leaving the page.
 *
 * Uses the browser's <dialog> in modal mode, which provides the overlay,
 * keeps keyboard focus inside, and closes on Esc. It also closes when the
 * overlay or the close button is clicked, and focus returns to the cover.
 * Ctrl/Cmd/Shift-click or middle-click still opens the image in a new tab.
 */
const CoverLightbox = ({ src, alt, caption, children }: CoverLightboxProps) => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLAnchorElement>(null);
  const [isOpen, setIsOpen] = useState(false);

  const openLightbox = (event: MouseEvent<HTMLAnchorElement>) => {
    // Let the browser handle "open in new tab" gestures
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.button === 1) return;
    event.preventDefault();
    setIsOpen(true);
  };

  // Runs for every way of closing: Esc, the close button, or the overlay
  const handleClose = useCallback(() => {
    setIsOpen(false);
    triggerRef.current?.focus();
  }, []);

  const closeLightbox = useCallback(() => {
    const dialog = dialogRef.current;
    if (!dialog?.open) return;

    if (typeof dialog.close === 'function') {
      dialog.close(); // fires the "close" event, which calls handleClose
    } else {
      // Browsers without <dialog> support don't fire "close", so finish here
      dialog.removeAttribute('open');
      handleClose();
    }
  }, [handleClose]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog || !isOpen || dialog.open) return;

    if (typeof dialog.showModal === 'function') dialog.showModal();
    else dialog.setAttribute('open', '');

    // Keep the page behind the overlay from scrolling
    const previousOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    return () => {
      document.documentElement.style.overflow = previousOverflow;
    };
  }, [isOpen]);


  // Clicking anywhere except the image, caption or close button closes it
  const handleDialogClick = (event: MouseEvent<HTMLDialogElement>) => {
    const target = event.target as Element;
    if (!target.closest('img, figcaption, button')) closeLightbox();
  };

  return (
    <>
      <a
        ref={triggerRef}
        href={src}
        className={styles.trigger}
        onClick={openLightbox}
        aria-haspopup="dialog"
        aria-label={`View larger: ${caption} cover`}
      >
        {children}
      </a>

      <dialog
        ref={dialogRef}
        className={styles.dialog}
        aria-label={`${caption} cover`}
        onClose={handleClose}
        onClick={handleDialogClick}
      >
        {isOpen && (
          <figure className={styles.figure}>
            <img className={styles.image} src={src} alt={alt} />
            <figcaption className={styles.caption}>{caption}</figcaption>
          </figure>
        )}
        <button type="button" className={styles.close} onClick={closeLightbox} aria-label="Close">
          <span aria-hidden="true">×</span>
        </button>
      </dialog>
    </>
  );
};

export default CoverLightbox;