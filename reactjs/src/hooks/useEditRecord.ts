import { RefObject, useEffect } from 'react';

interface UseEditRecordOptions<TRecord> {
  /** The :id from the URL; undefined on an "Add" page */
  id: string | undefined;
  /** The record with that id, once it's in the store */
  record: TRecord | undefined | null;
  /** Loads the record by id */
  fetchRecord: (id: string) => unknown;
  /** Turns the record into the form's values */
  toFormState: (record: TRecord) => void;
  /** First field, focused when the page opens */
  inputRef?: RefObject<HTMLInputElement>;
}

export const useEditRecord = <TRecord extends { id?: string | number }>({
  id,
  record,
  fetchRecord,
  toFormState,
  inputRef,
}: UseEditRecordOptions<TRecord>) => {
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (id) fetchRecord(id);
    inputRef?.current?.focus();
    // fetchRecord is a stable Redux action; inputRef is a ref
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    if (record && id && String(record.id) === id) {
      toFormState(record);
    }
    // toFormState only calls setFormState, which is stable
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [record, id]);
};