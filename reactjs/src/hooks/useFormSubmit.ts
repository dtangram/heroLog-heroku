import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import { REDIRECT_DELAY } from '../constants/forms';

interface UseFormSubmitOptions {
  /** Checks the fields and sets any errors; returns false to stop */
  validate: () => boolean;
  /** Saves the record */
  save: () => unknown;
  /** Runs after the success message has shown, e.g. to navigate away */
  onSaved: () => void;
  /** Shows a save error on the form */
  onError: (message: string) => void;
  /** Fallback error text when the error has no message */
  failureMessage?: string;
}

/** Store actions resolve to { ok: false, error } when the API rejects a save. */
const saveFailed = (outcome: unknown): string | null => {
  if (outcome && typeof outcome === 'object' && 'ok' in outcome && (outcome as { ok: unknown }).ok === false) {
    return String((outcome as { error?: unknown }).error || 'Something went wrong');
  }
  return null;
};

/**
 * The submit steps the forms share: ignore double clicks, validate, scroll up
 * to show errors, save, show success only if the save worked, then leave
 * after a short delay.
 */
export const useFormSubmit = ({ validate, save, onSaved, onError, failureMessage = 'Failed to save' }: UseFormSubmitOptions) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const submittingRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Don't navigate after the user has already left the page
  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  const handleSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (submittingRef.current) return;

      if (!validate()) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }

      submittingRef.current = true;
      setIsSubmitting(true);
      setIsSaved(false);

      try {
        const outcome = await save();
        const error = saveFailed(outcome);
        if (error) throw new Error(error);

        setIsSaved(true);
        timerRef.current = setTimeout(onSaved, REDIRECT_DELAY);
      } catch (error) {
        console.error('❌ Submit error:', error);
        onError(error instanceof Error && error.message ? error.message : failureMessage);
        window.scrollTo({ top: 0, behavior: 'smooth' });
        submittingRef.current = false;
        setIsSubmitting(false);
      }
    },
    [validate, save, onSaved, onError, failureMessage]
  );

  return { isSubmitting, isSaved, handleSubmit };
};