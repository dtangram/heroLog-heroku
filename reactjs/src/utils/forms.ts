export const getSubmitLabel = (isSubmitting: boolean, isEditMode: boolean): string => {
  if (isSubmitting) return 'SUBMITTING';
  return isEditMode ? 'UPDATE' : 'SUBMIT';
};

export const toFormText = (value: unknown): string =>
  value === undefined || value === null ? '' : String(value);