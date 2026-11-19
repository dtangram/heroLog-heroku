import React, { MouseEvent, useEffect, useRef, useSyncExternalStore } from 'react';
import { closeDialog, dismissToast, DialogItem, getDialogState, subscribe } from './dialogQueue';
import styles from './styles.module.css';

interface ModalProps {
  dialog: DialogItem;
}

/** One popup over a dark overlay. Esc or a click on the overlay counts as Cancel. */
const Modal = ({ dialog }: ModalProps) => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const answeredRef = useRef(false);
  const titleId = `dialog-title-${dialog.id}`;
  const messageId = `dialog-message-${dialog.id}`;

  const answer = (value: boolean) => {
    if (answeredRef.current) return;
    answeredRef.current = true;
    closeDialog(dialog.id, value);
  };

  useEffect(() => {
    const element = dialogRef.current;
    if (!element) return;

    // Put focus back where it was (e.g. the Delete button) once the popup closes
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const previousOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';

    if (!element.open) {
      if (typeof element.showModal === 'function') element.showModal();
      else element.setAttribute('open', '');
    }
    element.querySelector<HTMLButtonElement>('[data-autofocus]')?.focus();

    return () => {
      document.documentElement.style.overflow = previousOverflow;
      if (element.open && typeof element.close === 'function') element.close();
      previouslyFocused?.focus?.();
    };
  }, []);

  // Esc: the browser fires "cancel" on the dialog
  const handleCancel = (event: React.SyntheticEvent<HTMLDialogElement>) => {
    event.preventDefault();
    answer(false);
  };

  // The overlay is part of the <dialog> element; the panel inside is not
  const handleOverlayClick = (event: MouseEvent<HTMLDialogElement>) => {
    if (event.target === event.currentTarget) answer(false);
  };

  const isConfirm = dialog.kind === 'confirm';
  const confirmClass =
    isConfirm && dialog.tone === 'danger' ? `${styles.button} ${styles.danger}` : `${styles.button} ${styles.primary}`;

  return (
    <dialog
      ref={dialogRef}
      className={styles.dialog}
      role="alertdialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={messageId}
      onCancel={handleCancel}
      onClick={handleOverlayClick}
    >
      <div className={styles.panel}>
        <h2 id={titleId} className={styles.title}>
          {dialog.title}
        </h2>
        <p id={messageId} className={styles.message}>
          {dialog.message}
        </p>
        <div className={styles.actions}>
          {isConfirm ? (
            <>
              {/* Cancel gets focus, so pressing Enter by habit never deletes anything */}
              <button type="button" className={`${styles.button} ${styles.secondary}`} onClick={() => answer(false)} data-autofocus>
                {dialog.cancelLabel}
              </button>
              <button type="button" className={confirmClass} onClick={() => answer(true)}>
                {dialog.confirmLabel}
              </button>
            </>
          ) : (
            <button type="button" className={confirmClass} onClick={() => answer(true)} data-autofocus>
              {dialog.buttonLabel}
            </button>
          )}
        </div>
      </div>
    </dialog>
  );
};

/** Draws the popups and toasts. Mount once, in App. */
const DialogHost = () => {
  const { dialogs, toasts } = useSyncExternalStore(subscribe, getDialogState, getDialogState);
  const current = dialogs[0];

  return (
    <>
      {current && <Modal key={current.id} dialog={current} />}

      {/* Always in the page, so screen readers announce toasts as they arrive */}
      <div className={styles.toasts} role="status" aria-live="polite">
        {toasts.map(toast => (
          <div key={toast.id} className={`${styles.toast} ${styles[toast.tone]}`}>
            <p className={styles.toastMessage}>{toast.message}</p>
            <button
              type="button"
              className={styles.toastClose}
              onClick={() => dismissToast(toast.id)}
              aria-label="Dismiss notification"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </>
  );
};

export default DialogHost;