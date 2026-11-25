import { showConfirm } from '../components/dialog';
import type { APICallResult, DuplicateMatch } from '../store/helpers/callAPIMiddleware';

/** The duplicate the API reported, if the save was refused for that reason. */
export const duplicateIn = (outcome: unknown): DuplicateMatch | null => {
  if (!outcome || typeof outcome !== 'object') return null;
  const result = outcome as Partial<Extract<APICallResult, { ok: false }>>;
  return result.ok === false && result.duplicate ? result.duplicate : null;
};

/**
 * Saves, and if the user already has this issue, asks before saving a second
 * copy. Publishers and titles can't be duplicated, so for those the API's
 * "You already have …" message is shown on the form as the error.
 *
 * `save(allowDuplicate)` runs the store action and returns its result.
 */
export const saveUnlessDuplicate = async (save: (allowDuplicate: boolean) => unknown): Promise<unknown> => {
  const outcome = await save(false);
  const duplicate = duplicateIn(outcome);
  if (!duplicate || !duplicate.canSaveAnyway) return outcome;

  const confirmed = await showConfirm(
    `You already have ${duplicate.name}. Do you want to save another copy?`,
    { title: 'Already in your collection', confirmLabel: 'Save another copy', cancelLabel: "Don't save" }
  );
  if (confirmed) return save(true);

  return { ok: false, error: `Not saved. You already have ${duplicate.name}.` };
};