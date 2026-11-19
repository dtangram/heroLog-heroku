export const getSubmitLabel = (isSubmitting: boolean, isEditMode: boolean): string => {
  if (isSubmitting) return 'SUBMITTING';
  return isEditMode ? 'UPDATE' : 'SUBMIT';
};

export const toFormText = (value: unknown): string =>
  value === undefined || value === null ? '' : String(value);

export type CoverType = 'Regular' | 'Variant' | '';

/**
 * Saved comics and cover scans use "regular" / "variant", but the form's radio
 * buttons use "Regular" / "Variant". This converts either way of writing it, so
 * the right radio button is selected when a form opens or a scan fills it in.
 */
export const toCoverType = (value: unknown): CoverType => {
  const text = String(value ?? '').trim().toLowerCase();
  if (text === 'regular') return 'Regular';
  if (text === 'variant') return 'Variant';
  return '';
};