import { ChangeEvent, useCallback, useState } from 'react';

const DIGITS_ONLY = /^[0-9]*$/;

export const useFormFields = <
  TState extends Record<string, string>,
  TErrors extends Partial<Record<string, string>>
>(initialState: TState) => {
  const [formState, setFormState] = useState<TState>(initialState);
  const [formErrors, setFormErrors] = useState<TErrors>({} as TErrors);

  /** Remove a field's error (removed, not set to undefined, so the error list never shows a blank). */
  const clearFieldError = useCallback((field: string) => {
    setFormErrors(prev => {
      if (!(field in prev)) return prev;
      const next = { ...prev };
      delete next[field as keyof TErrors];
      return next;
    });
  }, []);

  const setField = useCallback(
    (field: keyof TState, value: string) => {
      setFormState(prev => ({ ...prev, [field]: value }));
      clearFieldError(field as string);
    },
    [clearFieldError]
  );

  /** Text inputs: uses the input's name attribute as the field. */
  const handleInputChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const { name, value } = event.target;
      setField(name as keyof TState, value);
    },
    [setField]
  );

  /** Number inputs: accepts digits only, so letters typed into Issue or Year are ignored. */
  const handleNumberChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>, field: keyof TState) => {
      const { value } = event.target;
      if (value === '' || DIGITS_ONLY.test(value)) {
        setField(field, value);
      }
    },
    [setField]
  );

  /** The regular / variant cover radio buttons. */
  const handleTypeChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      setField('type' as keyof TState, event.target.value);
    },
    [setField]
  );

  return {
    formState,
    setFormState,
    formErrors,
    setFormErrors,
    setField,
    clearFieldError,
    handleInputChange,
    handleNumberChange,
    handleTypeChange,
  };
};